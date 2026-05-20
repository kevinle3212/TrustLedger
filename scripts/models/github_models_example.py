#!/usr/bin/env python3
"""
GitHub Models inference examples for TrustLedger documentation and CI.

Uses the Azure AI Inference SDK against the GitHub Models endpoint:
  https://models.github.ai/inference

Requires GITHUB_TOKEN with models access (same token as GitHub Actions).

Usage:
  pip install -r scripts/models/requirements.txt
  export GITHUB_TOKEN=ghp_...
  python scripts/models/github_models_example.py --scenario all
  python scripts/models/github_models_example.py --scenario summarize
"""

from __future__ import annotations

import argparse
import os
import sys
import time

from azure.ai.inference import ChatCompletionsClient
from azure.ai.inference.models import SystemMessage, UserMessage
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import HttpResponseError

ENDPOINT = "https://models.github.ai/inference"
DEFAULT_MODEL = "openai/gpt-4.1"


def client() -> ChatCompletionsClient:
	token = os.environ.get("GITHUB_TOKEN")
	if not token:
		raise SystemExit("GITHUB_TOKEN is not set")
	return ChatCompletionsClient(
		endpoint=ENDPOINT,
		credential=AzureKeyCredential(token),
	)


def complete(
	c: ChatCompletionsClient,
	*,
	system: str,
	user: str,
	model: str = DEFAULT_MODEL,
	max_tokens: int = 256,
) -> str:
	response = c.complete(
		messages=[
			SystemMessage(content=system),
			UserMessage(content=user),
		],
		model=model,
		max_tokens=max_tokens,
	)
	choice = response.choices[0]
	if choice.message is None or choice.message.content is None:
		raise RuntimeError("Empty model response")
	return choice.message.content.strip()


def scenario_summarize(c: ChatCompletionsClient) -> None:
	text = (
		"The app crashes when I upload a PDF from my phone. "
		"Desktop uploads work fine."
	)
	out = complete(
		c,
		system="Summarize support messages in one sentence starting with 'Summary -'.",
		user=f"Summarize:\n{text}",
		max_tokens=128,
	)
	print("[summarize]", out)
	if not out.startswith("Summary -"):
		raise SystemExit("summarize: expected output to start with 'Summary -'")


def scenario_generate(c: ChatCompletionsClient) -> None:
	out = complete(
		c,
		system="Write at most two sentences of release notes for TrustLedger.",
		user=(
			"Bullets:\n"
			"- ERC-20 escrow demo\n"
			"- Juror reputation demo\n"
			"- /reputation page"
		),
		max_tokens=200,
	)
	print("[generate]", out)
	if "TrustLedger" not in out and "escrow" not in out.lower():
		raise SystemExit("generate: expected escrow-related content")


def scenario_qa(c: ChatCompletionsClient) -> None:
	out = complete(
		c,
		system=(
			"Answer using ONLY the context. "
			"If unknown, say: I don't have enough information in the provided context."
		),
		user=(
			"Context: Jurors stake ETH and vote in commit-reveal disputes.\n"
			"Question: How are jurors selected?"
		),
		max_tokens=200,
	)
	print("[qa]", out)
	if len(out) < 10:
		raise SystemExit("qa: response too short")


def scenario_invalid_model(c: ChatCompletionsClient) -> None:
	try:
		complete(
			c,
			system="You are a test assistant.",
			user="Say hello.",
			model="this-model/does-not-exist",
			max_tokens=16,
		)
	except HttpResponseError as err:
		print("[invalid_model] caught expected HttpResponseError:", err.status_code)
		return
	raise SystemExit("invalid_model: expected HttpResponseError")


def scenario_rate_limit_probe(c: ChatCompletionsClient, *, burst: int = 12) -> None:
	"""Sends a short burst of requests; passes if any 429 is observed or all succeed."""
	hit_429 = False
	for i in range(burst):
		try:
			out = complete(
				c,
				system="Reply with exactly one word: ok",
				user=f"ping {i}",
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
		print("[rate_limit_probe] no 429 in burst (quota may be high on this token)")


SCENARIOS = {
	"summarize": scenario_summarize,
	"generate": scenario_generate,
	"qa": scenario_qa,
	"invalid_model": scenario_invalid_model,
	"rate_limit": scenario_rate_limit_probe,
}


def main() -> None:
	parser = argparse.ArgumentParser(description="Run GitHub Models example scenarios")
	parser.add_argument(
		"--scenario",
		default="all",
		choices=[*SCENARIOS.keys(), "all"],
		help="Which scenario to run (default: all)",
	)
	parser.add_argument(
		"--skip-rate-limit",
		action="store_true",
		help="Skip burst rate-limit probe (avoids consuming quota)",
	)
	args = parser.parse_args()

	c = client()
	names = list(SCENARIOS.keys()) if args.scenario == "all" else [args.scenario]
	if args.skip_rate_limit:
		names = [n for n in names if n != "rate_limit"]

	for name in names:
		print(f"\n=== {name} ===")
		SCENARIOS[name](c)

	print("\nAll selected scenarios finished.")


if __name__ == "__main__":
	main()
