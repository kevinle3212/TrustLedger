#!/usr/bin/env python3
"""Generate a deterministic TrustLedger wallet analytics SVG."""

from __future__ import annotations

import argparse
import pathlib
import sys


DEFAULT_OUTPUT = pathlib.Path("assets/analytics/wallet-analytics-preview.svg")


def build_svg() -> str:
    labels = ["Pending", "Active", "Submitted", "Approved", "Disputed", "Resolved"]
    values = [2, 5, 3, 8, 1, 4]
    max_value = max(values)
    rows: list[str] = []

    for index, (label, value) in enumerate(zip(labels, values, strict=True)):
        y = 132 + index * 42
        width = 300 * value / max_value
        rows.append(
            f'<text x="56" y="{y}" class="label">{label}</text>'
            f'<rect x="160" y="{y - 16}" width="300" height="18" rx="9" class="track"/>'
            f'<rect x="160" y="{y - 16}" width="{width:.1f}" height="18" rx="9" class="bar"/>'
            f'<text x="484" y="{y}" class="value">{value}</text>'
        )

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="title desc">
  <title id="title">TrustLedger Wallet Analytics Preview</title>
  <desc id="desc">Privacy-safe aggregate contract status visualization for a connected TrustLedger wallet.</desc>
  <style>
    .bg {{ fill: #f8fafc; }}
    .panel {{ fill: #ffffff; stroke: #e5e7eb; stroke-width: 2; }}
    .title {{ fill: #111827; font: 700 42px system-ui, -apple-system, sans-serif; }}
    .body {{ fill: #4b5563; font: 400 20px system-ui, -apple-system, sans-serif; }}
    .label {{ fill: #374151; font: 600 18px system-ui, -apple-system, sans-serif; }}
    .value {{ fill: #111827; font: 700 18px ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .track {{ fill: #e0e7ff; }}
    .bar {{ fill: #4f46e5; }}
    .metric {{ fill: #eef2ff; stroke: #c7d2fe; stroke-width: 2; }}
    .metricText {{ fill: #312e81; font: 700 30px system-ui, -apple-system, sans-serif; }}
    .metricLabel {{ fill: #4338ca; font: 600 15px system-ui, -apple-system, sans-serif; }}
  </style>
  <rect width="1200" height="675" class="bg"/>
  <rect x="36" y="36" width="1128" height="603" rx="28" class="panel"/>
  <text x="72" y="100" class="title">Privacy-Safe Wallet Analytics</text>
  <text x="72" y="136" class="body">Public contract state, local app preferences, and reputation summaries without private-wallet scraping.</text>
  <g>{''.join(rows)}</g>
  <rect x="720" y="190" width="176" height="116" rx="22" class="metric"/>
  <text x="748" y="244" class="metricText">23</text>
  <text x="748" y="278" class="metricLabel">Visible Contracts</text>
  <rect x="920" y="190" width="176" height="116" rx="22" class="metric"/>
  <text x="948" y="244" class="metricText">87%</text>
  <text x="948" y="278" class="metricLabel">Completion Rate</text>
  <rect x="720" y="330" width="176" height="116" rx="22" class="metric"/>
  <text x="748" y="384" class="metricText">94</text>
  <text x="748" y="418" class="metricLabel">Privacy Score</text>
  <rect x="920" y="330" width="176" height="116" rx="22" class="metric"/>
  <text x="948" y="384" class="metricText">4.8</text>
  <text x="948" y="418" class="metricLabel">Reputation</text>
  <text x="72" y="586" class="body">No private keys, seed phrases, emails, documents, or encrypted draft bodies are read.</text>
</svg>
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    svg = build_svg()

    if args.check:
        existing = args.output.read_text(encoding="utf-8") if args.output.exists() else ""
        if existing != svg:
            print(f"{args.output} is stale. Run npm run analytics:generate.", file=sys.stderr)
            return 1
        print(f"{args.output} is up to date.")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(svg, encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
