# Utilities

<a id="top"></a>

<!-- docs-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-nav:end -->

## Table of Contents

<!-- docs-toc:start -->

- [Contract Generator](#contract-generator)
    - [Function](#function)
    - [Generate The Demo PDF](#generate-the-demo-pdf)
- [Ollama And Continue](#ollama-and-continue)
    - [Good Fit For `qwen3:8b`](#good-fit-for-qwen38b)
    - [Bad Fit For `qwen3:8b`](#bad-fit-for-qwen38b)
    - [When To Use Continue, Cursor, Claude Code, Or Codex](#when-to-use-continue-cursor-claude-code-or-codex)
    - [Install Ollama](#install-ollama)
    - [Pull The Model](#pull-the-model)
    - [Run On The Same Machine](#run-on-the-same-machine)
    - [Run On A Separate LAN Machine](#run-on-a-separate-lan-machine)
    - [Configure Continue](#configure-continue)
    - [Verify Connectivity](#verify-connectivity)
- [Python Tooling](#python-tooling)
- [Log Retention](#log-retention)
- [Cross-Platform Script Support](#cross-platform-script-support)
- [Authors and Contributors](#authors-and-contributors)
- [Legal](#legal)

<!-- docs-toc:end -->

> **Kevin K. Le** ([LinkedIn](https://linkedin.com/in/lekevin1)) — Founder,
> Founding Engineer, and Current Lead Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon.
>
> **Kellen Snider** — Founding Engineer; Software Engineer at the Oregon
> Blockchain Group, University of Oregon. His vision, ideas, and dedication
> during TrustLedger's Ethereum development were invaluable to the codebase we
> build on today.
>
> See [`CREDITS.md`](CREDITS.md).

This document covers utility scripts and helper assets outside the main frontend
and contract packages.

## Contract Generator

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

`utils/generate_contract.py` generates a professional freelance service
agreement PDF for demos and exposes reusable template data for future workflows.

### Function

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```python
generate_contract_template(
    agreement_id="TL-DEMO-0001",
    effective_date="May 26, 2026",
    client=None,
    freelancer=None,
    scope_of_work=None,
    escrow_amount="1.00 ETH",
    arbitration_fee="5% (held only if a dispute is opened)",
    warranty_holdback="10% for 30 days after approval",
    acceptance_window="48 hours after work submission",
)
```

The returned `ContractTemplate` includes:

- Configurable parties.
- Scope of work.
- Payment and escrow terms.
- Deliverables and deadlines.
- Intellectual property clause.
- Confidentiality clause.
- Termination clause.
- Dispute-resolution clause.
- Signature sections.

### Generate The Demo PDF

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

```bash
python3 utils/generate_contract.py
```

Output:

```text
utils/sample-contract.pdf
```

## Ollama And Continue

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

TrustLedger can use the Continue extension with a local Ollama model for
private, low-cost coding assistance. The current local profile targets
`qwen3:8b`, served either on the same development machine or from a separate LAN
machine with 8 GB RAM.

The helper script is:

```bash
bash tools/ollama-continue.sh --help
```

It can install Ollama, pull the model, start local or LAN serving, print a
Continue snippet, check whether a configured Ollama API exposes the model, and
send a small generation request.

### Good Fit For `qwen3:8b`

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use `qwen3:8b` for:

- Short code explanations and repo navigation after graphify has oriented the
  task.
- Small TypeScript, React, Solidity, Markdown, shell, and config edits.
- Drafting tests, docs snippets, commit-message candidates, and review
  checklists.
- Summarizing focused files, diagnostics, logs, and command output.
- Offline or private first-pass work where latency is acceptable.

### Bad Fit For `qwen3:8b`

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Do not rely on `qwen3:8b` alone for:

- Final security review of wallet auth, signatures, sessions, nonces,
  arbitration, or smart-contract value flow.
- Large architectural refactors across many subsystems.
- Mainnet-readiness contract audits, formal verification, or economic analysis.
- Long-context reasoning over the full repository without graphify or curated
  context.
- CI failure triage where exact tool output and deterministic reproduction are
  required.

For those tasks, use the project review agents, skills, tests, static analyzers,
and quality gates documented in `AGENTS.md`, `CLAUDE.md`, and
`docs/QUALITY-STANDARDS.md`.

### When To Use Continue, Cursor, Claude Code, Or Codex

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use Continue with Ollama when:

- You want private, local, low-cost first-pass help.
- The task is small, well-scoped, and already oriented by graphify or focused
  file context.
- You are drafting docs, tests, comments, refactors, or simple code edits that
  will still go through the repo's normal validation gates.
- You want a second opinion without sending code to a hosted model.

Use Cursor when:

- You need tight IDE context, direct edits, project search, diagnostics,
  terminal commands, and fast pair-programming loops.
- The task spans several files but is still interactive enough to review as it
  changes.
- You need to apply the `.continue/rules/`, `.cursor/rules/`, `AGENTS.md`, and
  graphify context while keeping the working tree visible.

Use Claude Code when:

- The task needs a strong autonomous coding agent with repo-wide planning,
  careful editing, and final QA discipline.
- You are running gstack workflows such as `/autoplan`, `/review`, `/cso`,
  `/qa`, or `/ship`.
- The work is security-sensitive, architecture-heavy, or requires coordinating
  tests, docs, and code changes across subsystems.

Use Codex when:

- You want command-line oriented implementation, debugging, or targeted
  refactoring with explicit shell validation.
- You need `rtk`-prefixed command discipline from the home Codex guidance.
- You are doing focused terminal-heavy tasks such as reproducing a failure,
  validating scripts, or checking generated artifacts.

Alternate between tools when:

- Continue/Ollama produces a draft, then Cursor or Claude Code applies,
  validates, and fixes it against the real repository.
- Cursor or Codex finds a concrete failure, then Continue/Ollama helps draft a
  focused explanation, test idea, or docs snippet.
- Claude Code performs a security or architecture pass, then Cursor handles
  small reviewed edits in the IDE.
- Any model disagrees with another: prefer repository evidence, tests, graphify,
  static analyzers, and source-of-truth docs over model confidence.

Avoid using Continue/Ollama as the final authority for security, mainnet,
deployment, or legal decisions. It is a useful local assistant, not a substitute
for TrustLedger's review agents, quality gates, or owner judgment.

### Install Ollama

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

macOS with Homebrew:

```bash
bash tools/ollama-continue.sh install
```

Manual macOS install:

```bash
open https://ollama.com/download
```

Linux install:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verify:

```bash
ollama --version
```

### Pull The Model

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Pull the default model:

```bash
bash tools/ollama-continue.sh pull
```

Equivalent raw Ollama command:

```bash
ollama pull qwen3:8b
```

The model host must have enough disk space for the model and enough memory for
acceptable latency. The separate TrustLedger LAN host currently uses an 8 GB RAM
machine for `qwen3:8b`; keep other memory-heavy apps closed on that host.

### Run On The Same Machine

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use this when Continue and Ollama run on the same Mac or Linux workstation:

```bash
bash tools/ollama-continue.sh serve-local
```

Equivalent raw command:

```bash
OLLAMA_HOST=127.0.0.1:11434 ollama serve
```

Some desktop installs run Ollama as a background service. If so, `ollama serve`
may report that the port is already in use; that is fine if this check works:

```bash
OLLAMA_API_BASE=http://127.0.0.1:11434 bash tools/ollama-continue.sh check
```

Use `http://127.0.0.1:11434` as the Continue `apiBase`.

### Run On A Separate LAN Machine

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Use this when a separate 8 GB RAM machine hosts `qwen3:8b` and the development
machine connects over the local network.

On the Ollama host:

```bash
bash tools/ollama-continue.sh pull
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Equivalent helper command:

```bash
bash tools/ollama-continue.sh serve-lan
```

Find the host IP address.

macOS:

```bash
ipconfig getifaddr en0
```

Linux:

```bash
hostname -I
```

Allow inbound TCP `11434` only from the trusted LAN. Avoid exposing Ollama
directly to the public internet; it has no project auth layer by default.

On the development machine, verify the host:

```bash
OLLAMA_API_BASE=http://192.168.12.181:11434 \
  bash tools/ollama-continue.sh check
```

Replace `192.168.12.181` with the actual LAN IP. If DHCP changes the address,
reserve it in the router or update Continue's `apiBase`.

### Configure Continue

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Keep `~/.continue/config.yaml` global and model-focused. TrustLedger-specific
rules live in `.continue/rules/` so they apply only in this workspace.

Same-machine Continue snippet:

```yaml
name: Local AI
version: 1.0.0
schema: v1

models:
    - name: Qwen3 Coder 8B (Local)
      provider: ollama
      model: qwen3:8b
      apiBase: http://127.0.0.1:11434
```

Separate LAN host snippet:

```yaml
name: Local AI
version: 1.0.0
schema: v1

models:
    - name: Qwen3 Coder 8B (LAN)
      provider: ollama
      model: qwen3:8b
      apiBase: http://192.168.12.181:11434
```

The Continue extension loads TrustLedger project rules from:

```text
.continue/rules/
```

Use Continue for local chat, edits, and first-pass review. Continue responses
still need the same TrustLedger validation gates as any other code change.

### Verify Connectivity

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Check the configured API:

```bash
OLLAMA_API_BASE=http://192.168.12.181:11434 \
  bash tools/ollama-continue.sh check
```

Run a functional generation test:

```bash
OLLAMA_API_BASE=http://192.168.12.181:11434 \
  bash tools/ollama-continue.sh generate-test
```

Expected response shape:

```json
{
    "response": "ok",
    "done": true,
    "done_reason": "stop",
    "model": "qwen3:8b"
}
```

List models:

```bash
OLLAMA_API_BASE=http://192.168.12.181:11434 \
  bash tools/ollama-continue.sh tags
```

Print a Continue snippet:

```bash
OLLAMA_API_BASE=http://192.168.12.181:11434 \
  bash tools/ollama-continue.sh continue-snippet
```

Avoid tiny output budgets when smoke-testing Qwen3. A very small `num_predict`,
such as `8`, can stop with `done_reason: "length"` before the model emits
visible text. The helper uses `num_predict: 256` for the generation test.

## Python Tooling

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Python checks use strict mypy settings from `mypy.ini`.

```bash
npm run lint:py
```

Runtime dependencies:

- `utils/requirements.txt` for ReportLab and stubs.
- `scripts/models/requirements.txt` for GitHub Models integration.

See [Type Stubs](STUBS.md) for the hand-written Azure SDK stubs.

## Log Retention

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

Agent run notes, dependency audits, Impeccable notes, and transient issue
summaries belong in ignored `logs/` as Markdown. They should be useful
summaries, not raw terminal dumps.

npm is configured through `.npmrc` to write npm debug logs under `logs/npm`.
Those files are ignored by git; summarize important npm failures in readable
`logs/*.md` notes when an agent run needs a durable local record.

Check ignored local artifact retention:

```bash
npm run logs:check
npm run lint:logs
npm run tmp:check
```

Prune old or oversized local logs:

```bash
npm run logs:prune
npm run tmp:prune
npm run docker:storage:prune
```

Default log retention limits:

| Setting                  |         Default | Environment override             |
| ------------------------ | --------------: | -------------------------------- |
| Maximum files            |              25 | `TRUSTLEDGER_LOG_MAX_FILES`      |
| Maximum total size       | 2,000,000 bytes | `TRUSTLEDGER_LOG_MAX_BYTES`      |
| Maximum single file size |   500,000 bytes | `TRUSTLEDGER_LOG_MAX_FILE_BYTES` |
| Maximum age              |         30 days | `TRUSTLEDGER_LOG_MAX_AGE_DAYS`   |

`logs:check` is non-destructive and fails when `logs/` exceeds policy.
`logs:prune` removes stale, oversized, and oldest excess files until the local
directory is back under the same limits.

Temporary scratch files belong in ignored project-local `tmp/`, not system
`/tmp`, unless an external tool requires otherwise. Use
`TRUSTLEDGER_TMP_DIR=./tmp` when a command accepts an explicit temporary root.

Default tmp retention limits:

| Setting                  |          Default | Environment override             |
| ------------------------ | ---------------: | -------------------------------- |
| Maximum files            |              100 | `TRUSTLEDGER_TMP_MAX_FILES`      |
| Maximum total size       | 50,000,000 bytes | `TRUSTLEDGER_TMP_MAX_BYTES`      |
| Maximum single file size | 10,000,000 bytes | `TRUSTLEDGER_TMP_MAX_FILE_BYTES` |
| Maximum age              |           7 days | `TRUSTLEDGER_TMP_MAX_AGE_DAYS`   |

`tmp:check` is non-destructive and fails when `tmp/` exceeds policy. `tmp:prune`
removes stale, oversized, and oldest excess files until the local directory is
back under the same limits.

Docker storage retention is checked with:

```bash
npm run docker:storage:check
```

`docker:storage:check` is non-destructive and fails when Docker reports storage
above the 5 GB default threshold. `docker:storage:prune` runs
`docker system prune -a --volumes -f` only when storage exceeds that threshold.
Override the threshold with `TRUSTLEDGER_DOCKER_MAX_BYTES`.

## Cross-Platform Script Support

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

TrustLedger's primary automation uses Bash because the project depends on
Foundry, Hardhat, Docker, and Unix-like CI runners. Supported runtimes:

- macOS Terminal or zsh with Bash available.
- Linux shells.
- Windows WSL2, recommended for full contract/backend workflows.
- Windows Git Bash/MSYS2, supported for utility scripts when dependencies are
  installed.
- Windows PowerShell, supported for selected utility wrappers.

Bash utilities:

```bash
bash tools/keep-awake.sh --minutes 30 -- npm run foundry:test
bash tools/remove-duplicates.sh --max-depth 3 .
```

PowerShell equivalents:

```powershell
powershell -ExecutionPolicy Bypass -File tools/keep-awake.ps1 -Minutes 30 npm run foundry:test
powershell -ExecutionPolicy Bypass -File tools/remove-duplicates.ps1 -MaxDepth 3 .
```

For full setup on Windows, use WSL2:

```powershell
wsl --install -d Ubuntu
```

## Authors and Contributors

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

- **Kevin K. Le** — Founder, Founding Engineer, and Current Lead Engineer
  ([LinkedIn](https://www.linkedin.com/in/lekevin1))
- **Kellen Snider** — Founding Engineer
  ([LinkedIn](https://www.linkedin.com/in/kellen-snider-683396256/))

See [`CREDITS.md`](CREDITS.md) for the complete acknowledgement list.

## Legal

<!-- docs-section-nav:start -->

[Home](Home.md) · [Top](#top) · [Table of Contents](#table-of-contents)

<!-- docs-section-nav:end -->

This document is part of TrustLedger, an open-source decentralized escrow and
arbitration protocol. Use of this software and documentation is subject to the
[Terms and Conditions](TERMS_AND_CONDITIONS.md),
[Privacy Policy](PRIVACY_POLICY.md), and [Risk Disclosure](RISK_DISCLOSURE.md).
See [`LEGAL.md`](LEGAL.md) for the full compliance and licensing overview.
