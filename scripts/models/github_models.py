#!/usr/bin/env python3
"""
TrustLedger AI integration via GitHub Models.

Provides contract-aware AI capabilities for the TrustLedger escrow platform:

  summarize   - Natural-language dashboard summary of an EscrowContract
  generate    - Release notes from the live git log
  qa          - Q&A grounded in contract data (no hallucination)
  dispute     - Structured juror guidance from dispute evidence (JSON)
  risk        - Pre-creation risk assessment of a contract description (JSON)
  reputation  - Narrative reputation summary from rating history

CI utilities (used by .github/workflows/github-models.yml):
  invalid_model - Confirms HttpResponseError is raised for a bad model id
  rate_limit    - Optional burst probe; passes if any HTTP 429 is seen or all succeed

Endpoint: https://models.github.ai/inference
Requires: GITHUB_TOKEN with models access (same token as GitHub Actions).

Usage:
  pip install -r scripts/models/requirements.txt
  export GITHUB_TOKEN=ghp_...
  python scripts/models/github_models.py --scenario all
  python scripts/models/github_models.py --scenario dispute
  python scripts/models/github_models.py --scenario generate --model openai/gpt-4.1-mini
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import subprocess
import sys
import time
from collections.abc import Callable
from typing import TypedDict

from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

# ─── Configuration ────────────────────────────────────────────────────────────

ENDPOINT = "https://models.github.ai/inference"
DEFAULT_MODEL = "openai/gpt-4.1"
_REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent


# ─── Client helpers ───────────────────────────────────────────────────────────


def make_client(model: str = DEFAULT_MODEL) -> ChatCompletionsClient:
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN is not set")
    return ChatCompletionsClient(endpoint=ENDPOINT, credential=AzureKeyCredential(token))


def complete(
    c: ChatCompletionsClient,
    *,
    system: str,
    user: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 256,
) -> str:
    response = c.complete(
        messages=[SystemMessage(content=system), UserMessage(content=user)],
        model=model,
        max_tokens=max_tokens,
    )
    choice = response.choices[0]
    if choice.message is None or choice.message.content is None:
        raise RuntimeError("Empty model response")
    return choice.message.content.strip()


def parse_json_response(raw: str, scenario: str) -> dict[str, object]:
    """Strip markdown code fences and parse JSON; raises SystemExit on failure."""
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    try:
        parsed: object = json.loads(text)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{scenario}: invalid JSON response — {exc}\n\nRaw:\n{raw}") from exc
    if not isinstance(parsed, dict):
        raise SystemExit(f"{scenario}: expected a JSON object, got {type(parsed).__name__}")
    return parsed


# ─── Sample data ──────────────────────────────────────────────────────────────

# Mirrors the EscrowContract Solidity struct (TrustLedger.sol).
SAMPLE_CONTRACT: dict[str, object] = {
    "id": 42,
    "client": "0xdEaD00000000000000000000000000000000bEEF",
    "freelancer": "0x1337000000000000000000000000000000C0dE",
    "status": "SUBMITTED",
    "amount_eth": 2.0,
    "usd_value_at_creation": 5000,
    "arbitration_fee_bps": 500,   # 5 %
    "hold_back_bps": 1000,        # 10 % warranty hold-back
    "project_deadline": "2026-06-15T00:00:00Z",
    "acceptance_window_hours": 72,
    "acceptance_deadline": "2026-06-10T14:00:00Z",
    "warranty_period_days": 30,
    "token": "0x0000000000000000000000000000000000000000",  # native ETH
    "description": (
        "Build a DeFi portfolio dashboard: on-chain position tracking across "
        "Uniswap v3, Aave v3, and Compound v3, with real-time price feeds via Chainlink "
        "and an ERC-20 balance aggregator. Deliver a Next.js frontend, tested subgraph "
        "queries, and deployment documentation."
    ),
    "proof_of_work_uri": "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
    "submitted_at": "2026-06-08T10:23:45Z",
}

# Mirrors the Dispute struct + commit-reveal context (Arbitration.sol).
SAMPLE_DISPUTE: dict[str, object] = {
    "contract_id": 17,
    "description": (
        "Perform a security audit of a yield farming Solidity protocol "
        "(3 contracts, ~800 lines). Deliverable: written audit report with findings "
        "graded Critical/High/Medium/Low plus a remediated contract diff."
    ),
    "amount_eth": 3.0,
    "status": "DISPUTED",
    "phase": "COMMIT",
    "client_claim": (
        "The submitted audit report missed a critical re-entrancy vulnerability in "
        "harvest() that was later found by a third-party auditor. The report also has "
        "no coverage of the MasterChef fork logic, which was explicitly in scope. "
        "I am requesting 40 % completion — only basic checks were performed."
    ),
    "freelancer_defense": (
        "The harvest() function follows checks-effects-interactions and uses "
        "OpenZeppelin ReentrancyGuard; the pattern was not flagged because it is "
        "accepted industry practice. The MasterChef fork logic is covered under the "
        "staking section (Section 4, pages 12-14). I am requesting 90 % completion; "
        "the only missing item is the optional formal-verification addendum, which "
        "was never agreed upon in the original contract."
    ),
    "client_requested_pct": 40,
    "freelancer_requested_pct": 90,
}

# Rating history for ReputationRegistry sample address.
class Rating(TypedDict):
    """A single on-chain rating entry in an address's reputation history."""

    score: int
    role: str
    contract_id: int
    date: str


class ReputationSample(TypedDict):
    """Aggregated reputation profile for a sample address (mirrors the read model)."""

    address: str
    average_score: int
    total_ratings: int
    in_recovery_mode: bool
    ratings: list[Rating]


SAMPLE_REPUTATION: ReputationSample = {
    "address": "0x1337000000000000000000000000000000C0dE",
    "average_score": 79,
    "total_ratings": 8,
    "in_recovery_mode": False,
    "ratings": [
        {"score": 85, "role": "freelancer", "contract_id": 3,  "date": "2025-11-10"},
        {"score": 90, "role": "freelancer", "contract_id": 7,  "date": "2026-01-03"},
        {"score": 40, "role": "freelancer", "contract_id": 9,  "date": "2026-01-28"},
        {"score": 78, "role": "freelancer", "contract_id": 12, "date": "2026-02-14"},
        {"score": 92, "role": "freelancer", "contract_id": 17, "date": "2026-03-01"},
        {"score": 88, "role": "client",     "contract_id": 11, "date": "2026-03-20"},
        {"score": 65, "role": "freelancer", "contract_id": 21, "date": "2026-04-15"},
        {"score": 95, "role": "freelancer", "contract_id": 28, "date": "2026-05-22"},
    ],
}

# Intentionally vague description to exercise the risk-check scenario.
SAMPLE_CONTRACT_DESCRIPTION = (
    "I need someone to build a platform for my business. "
    "It should have a website and some backend stuff. "
    "Payment is $3,000 total — half upfront. "
    "Just get it done as fast as possible."
)


# ─── Scenario implementations ─────────────────────────────────────────────────


def scenario_summarize(c: ChatCompletionsClient, model: str) -> None:
    """Generate a 2-3 sentence dashboard summary of an EscrowContract."""
    out = complete(
        c,
        system=(
            "You are a TrustLedger assistant. Write a concise 2-3 sentence summary of an "
            "escrow contract for display on the user's dashboard. Cover: what work is being "
            "done, the payment amount and currency, the current lifecycle status, and the "
            "nearest deadline. Be factual and neutral. Do not use bullet points."
        ),
        user=f"Summarize this TrustLedger escrow contract:\n\n{json.dumps(SAMPLE_CONTRACT, indent=2)}",
        model=model,
        max_tokens=200,
    )
    print("[summarize]\n" + out)
    keywords = ("eth", "submitted", "defi", "dashboard", "chainlink", "2.0", "2 eth", "uniswap", "freelancer")
    if not any(kw in out.lower() for kw in keywords):
        raise SystemExit("summarize: expected contract-relevant content in response")


def _git_log(n: int = 30) -> str:
    """Return the last n commit subjects from the live git log, or '' on failure."""
    try:
        result = subprocess.run(
            ["git", "log", f"--max-count={n}", "--pretty=format:%s (%ad)", "--date=short"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=_REPO_ROOT,
        )
        return result.stdout.strip()
    except Exception:
        return ""


def scenario_generate(c: ChatCompletionsClient, model: str) -> None:
    """Generate user-facing release notes from the live git log."""
    log = _git_log(30)
    if not log:
        # Fallback for environments without git access.
        log = "\n".join([
            "feat(contracts): implement reputation recovery mechanism (2026-05-01)",
            "fix(fork-tests): clear freelancer bytecode and arbitration balance in setUp (2026-05-10)",
            "fix(deps): bump tmp override to 0.2.7 to patch path traversal GHSA (2026-05-18)",
            "ci(hooks): add pre-push forge gate and gitignore contracts/.env symlink (2026-05-22)",
            "fix(wagmi): replace deprecated coinbaseWallet with base connector (2026-05-25)",
        ])
    out = complete(
        c,
        system=(
            "You are a technical writer for TrustLedger, a decentralized escrow platform on Ethereum. "
            "Generate clean, user-facing release notes from the git commit log below. "
            "Group changes under headers: Contracts, Frontend, Security, CI/Tooling, Documentation. "
            "Omit pure style, formatting, and chore commits. Use past tense. Be concise. "
            "If a category has no entries, omit it entirely."
        ),
        user=f"Generate release notes from these commits:\n\n{log}",
        model=model,
        max_tokens=500,
    )
    print("[generate]\n" + out)
    if len(out) < 50:
        raise SystemExit("generate: response too short")


def scenario_qa(c: ChatCompletionsClient, model: str) -> None:
    """Answer a contract question using only the contract data as context."""
    out = complete(
        c,
        system=(
            "Answer questions using ONLY the provided TrustLedger contract data. "
            "If the answer cannot be derived from the data, say exactly: "
            "'This information is not available in the contract data.' "
            "Do not speculate or use outside knowledge."
        ),
        user=(
            f"Contract data:\n{json.dumps(SAMPLE_CONTRACT, indent=2)}\n\n"
            "Question: When does the client's acceptance window close, and what are the "
            "warranty hold-back terms for this contract?"
        ),
        model=model,
        max_tokens=200,
    )
    print("[qa]\n" + out)
    if len(out) < 20:
        raise SystemExit("qa: response too short")


def scenario_dispute(c: ChatCompletionsClient, model: str) -> None:
    """Produce structured juror guidance from a DISPUTED contract's evidence."""
    context = (
        f"Contract #{SAMPLE_DISPUTE['contract_id']}: {SAMPLE_DISPUTE['description']}\n"
        f"Amount: {SAMPLE_DISPUTE['amount_eth']} ETH  |  Status: {SAMPLE_DISPUTE['status']}\n\n"
        f"Client claim (requesting {SAMPLE_DISPUTE['client_requested_pct']} % completion):\n"
        f"{SAMPLE_DISPUTE['client_claim']}\n\n"
        f"Freelancer defense (requesting {SAMPLE_DISPUTE['freelancer_requested_pct']} % completion):\n"
        f"{SAMPLE_DISPUTE['freelancer_defense']}"
    )
    out = complete(
        c,
        system=(
            "You are a neutral TrustLedger arbitration assistant helping jurors analyze disputes. "
            "Output ONLY valid JSON (no markdown fences) with exactly these keys:\n"
            "  summary               : string  — 1-sentence dispute overview\n"
            "  client_strength       : integer — 1 (weak) to 5 (strong)\n"
            "  freelancer_strength   : integer — 1 (weak) to 5 (strong)\n"
            "  suggested_completion_pct : integer — 0-100\n"
            "  key_questions         : array of 2-3 strings jurors should consider\n"
            "  reasoning             : string  — 2-3 sentences explaining the suggested pct\n"
            "Base analysis only on the provided evidence. Be objective."
        ),
        user=f"Analyze this TrustLedger dispute:\n\n{context}",
        model=model,
        max_tokens=450,
    )
    print("[dispute]\n" + out)
    data = parse_json_response(out, "dispute")
    required = {"summary", "client_strength", "freelancer_strength", "suggested_completion_pct", "key_questions"}
    missing = required - data.keys()
    if missing:
        raise SystemExit(f"dispute: JSON missing keys: {missing}")
    pct = data["suggested_completion_pct"]
    if not isinstance(pct, (int, float, str)):
        raise SystemExit(f"dispute: suggested_completion_pct {pct!r} is not a number")
    if not (0 <= int(pct) <= 100):
        raise SystemExit(f"dispute: suggested_completion_pct {pct!r} out of range 0-100")


def scenario_risk(c: ChatCompletionsClient, model: str) -> None:
    """Flag ambiguous or risky terms in a contract description before on-chain creation."""
    out = complete(
        c,
        system=(
            "You are a TrustLedger contract risk reviewer. Analyze a freelance contract "
            "description for potential problems: ambiguous deliverables, missing deadlines, "
            "scope creep exposure, payment dispute risk, and IP ownership gaps. "
            "Output ONLY valid JSON (no markdown fences) with exactly these keys:\n"
            "  risk_level      : string — 'low' | 'medium' | 'high'\n"
            "  issues          : array of strings — specific problems found\n"
            "  recommendations : array of strings — concrete improvements\n"
            "Only flag genuine risks. If none, return an empty issues array."
        ),
        user=f"Assess this contract description before it is deployed on-chain:\n\n{SAMPLE_CONTRACT_DESCRIPTION}",
        model=model,
        max_tokens=350,
    )
    print("[risk]\n" + out)
    data = parse_json_response(out, "risk")
    if "risk_level" not in data:
        raise SystemExit("risk: JSON missing 'risk_level'")
    if data["risk_level"] not in ("low", "medium", "high"):
        raise SystemExit(f"risk: unexpected risk_level '{data['risk_level']}'")


def scenario_reputation(c: ChatCompletionsClient, model: str) -> None:
    """Write a reputation narrative from an address's rating history."""
    history = "\n".join(
        f"  score {r['score']}/100 as {r['role']} — contract #{r['contract_id']} ({r['date']})"
        for r in SAMPLE_REPUTATION["ratings"]
    )
    context = (
        f"Address: {SAMPLE_REPUTATION['address']}\n"
        f"Average score: {SAMPLE_REPUTATION['average_score']}/100 "
        f"over {SAMPLE_REPUTATION['total_ratings']} ratings\n"
        f"In recovery mode: {SAMPLE_REPUTATION['in_recovery_mode']}\n\n"
        f"Rating history (oldest first):\n{history}"
    )
    out = complete(
        c,
        system=(
            "You are a TrustLedger reputation analyst. Based on this rating history, write a "
            "2-3 sentence reputation narrative for the user's profile page. "
            "Highlight trends, strengths, and any concerns. "
            "Use second person ('Your reputation...'). Be honest but constructive."
        ),
        user=f"Write a reputation narrative for this TrustLedger user:\n\n{context}",
        model=model,
        max_tokens=200,
    )
    print("[reputation]\n" + out)
    if not any(kw in out.lower() for kw in ("reputation", "rating", "score", "your")):
        raise SystemExit("reputation: expected reputation-related content in response")


def scenario_invalid_model(c: ChatCompletionsClient, model: str) -> None:
    """Confirms HttpResponseError is raised when an invalid model id is used."""
    try:
        complete(
            c,
            system="You are a test assistant.",
            user="Say hello.",
            model="this-model/does-not-exist",
            max_tokens=16,
        )
    except HttpResponseError as err:
        print(f"[invalid_model] caught expected HttpResponseError: {err.status_code}")
        return
    raise SystemExit("invalid_model: expected HttpResponseError was not raised")


def scenario_rate_limit_probe(c: ChatCompletionsClient, model: str, *, burst: int = 12) -> None:
    """Send a short burst of requests; passes if any HTTP 429 is observed or all succeed."""
    hit_429 = False
    for i in range(burst):
        try:
            out = complete(
                c,
                system="Reply with exactly one word: ok",
                user=f"TrustLedger ping {i}",
                model=model,
                max_tokens=8,
            )
            print(f"[rate_limit_probe] {i}: {out[:40]}")
        except HttpResponseError as err:
            if err.status_code == 429:
                print(f"[rate_limit_probe] {i}: HTTP 429 (rate limited) — expected in burst tests")
                hit_429 = True
                break
            raise
        time.sleep(0.05)
    if not hit_429:
        print("[rate_limit_probe] no 429 observed in burst (quota may be high on this token)")


# ─── Scenario registry ────────────────────────────────────────────────────────

SCENARIOS: dict[str, Callable[[ChatCompletionsClient, str], None]] = {
    "summarize":     scenario_summarize,
    "generate":      scenario_generate,
    "qa":            scenario_qa,
    "dispute":       scenario_dispute,
    "risk":          scenario_risk,
    "reputation":    scenario_reputation,
    "invalid_model": scenario_invalid_model,
    "rate_limit":    scenario_rate_limit_probe,
}


# ─── Entry point ──────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="TrustLedger AI scenarios via GitHub Models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n".join(f"  {k:16s} {fn.__doc__ or ''}" for k, fn in SCENARIOS.items()),
    )
    parser.add_argument(
        "--scenario",
        default="all",
        choices=[*SCENARIOS, "all"],
        help="Scenario to run (default: all)",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"GitHub Models model id (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--skip-rate-limit",
        action="store_true",
        help="Skip the burst rate-limit probe to conserve quota",
    )
    args = parser.parse_args()

    c = make_client(args.model)
    names = list(SCENARIOS) if args.scenario == "all" else [args.scenario]
    if args.skip_rate_limit:
        names = [n for n in names if n != "rate_limit"]

    for name in names:
        print(f"\n{'=' * 60}\n  {name}\n{'=' * 60}")
        SCENARIOS[name](c, args.model)

    print(f"\n✓ All selected scenarios finished ({len(names)} run).")


if __name__ == "__main__":
    main()
