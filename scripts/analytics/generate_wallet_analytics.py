#!/usr/bin/env python3
"""Generate deterministic TrustLedger wallet analytics visuals."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
from dataclasses import dataclass

PROJECT_TMP = pathlib.Path("tmp/matplotlib")
os.environ.setdefault("MPLCONFIGDIR", str(PROJECT_TMP))
os.environ.setdefault("XDG_CACHE_HOME", "tmp/xdg-cache")

import matplotlib

matplotlib.use("svg")
from bokeh.models import ColumnDataSource
from bokeh.palettes import Viridis6
from matplotlib import colors
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.utils import PlotlyJSONEncoder
from scipy import stats
import seaborn as sns
import sympy as sp


DEFAULT_OUTPUT = pathlib.Path("assets/analytics/wallet-analytics-preview.svg")
DEFAULT_REPORT_OUTPUT = pathlib.Path("assets/analytics/wallet-analytics-report.json")
DEFAULT_PLOTLY_OUTPUT = pathlib.Path("assets/analytics/wallet-analytics-plotly.json")
DEFAULT_BOKEH_OUTPUT = pathlib.Path("assets/analytics/wallet-analytics-bokeh.json")
DEFAULT_FRONTEND_REPORT_OUTPUT = pathlib.Path(
    "src/lib/generated/wallet-analytics-report.json"
)


@dataclass(frozen=True)
class AnalyticsMetrics:
    """Derived values shown in the generated analytics visual."""

    visible_contracts: int
    completion_rate: float
    privacy_score: int
    reputation: float
    state_entropy_bits: float
    activity_trend_slope: float
    max_status_zscore: float


def build_wallet_frame() -> pd.DataFrame:
    """Return deterministic synthetic wallet metrics shaped like on-chain data."""

    labels = np.array(["Pending", "Active", "Submitted", "Approved", "Disputed", "Resolved"])
    values = np.array([2, 5, 3, 8, 1, 4], dtype=np.int64)
    return pd.DataFrame({"status": labels, "contracts": values})


def derive_metrics(frame: pd.DataFrame) -> AnalyticsMetrics:
    """Derive privacy-safe aggregate metrics from a wallet analytics frame."""

    visible_contracts = int(frame["contracts"].sum())
    completed = int(frame.loc[frame["status"].isin(["Approved", "Resolved"]), "contracts"].sum())
    completion_rate = float(sp.Rational(completed, visible_contracts) * 100)
    disputed = int(frame.loc[frame["status"] == "Disputed", "contracts"].sum())
    privacy_score = int(max(0, min(100, 100 - disputed * 6)))
    reputation = round(4.0 + completed / max(visible_contracts, 1), 1)
    counts = frame["contracts"].to_numpy(dtype=float)
    distribution = counts / counts.sum()
    trend = stats.linregress(np.arange(counts.size), counts).slope
    zscores = stats.zscore(counts)
    return AnalyticsMetrics(
        visible_contracts=visible_contracts,
        completion_rate=completion_rate,
        privacy_score=privacy_score,
        reputation=reputation,
        state_entropy_bits=round(float(stats.entropy(distribution, base=2)), 4),
        activity_trend_slope=round(float(trend), 4),
        max_status_zscore=round(float(np.max(np.abs(zscores))), 4),
    )


def analytics_palette() -> list[str]:
    """Return the deterministic chart palette shared by all generated specs."""

    return sns.color_palette("mako", 6).as_hex()


def build_svg(frame: pd.DataFrame, metrics: AnalyticsMetrics) -> str:
    """Render the deterministic analytics SVG."""

    normalized = frame["contracts"].to_numpy(dtype=float) / frame["contracts"].max()
    cmap = colors.LinearSegmentedColormap.from_list("trustledger", analytics_palette())
    bar_color = colors.to_hex(cmap(0.76))
    rows: list[str] = []

    for index, (_, row) in enumerate(frame.iterrows()):
        y = 132 + index * 42
        width = 300 * float(normalized[index])
        rows.append(
            f'<text x="56" y="{y}" class="label">{row["status"]}</text>'
            f'<rect x="160" y="{y - 16}" width="300" height="18" rx="9" class="track"/>'
            f'<rect x="160" y="{y - 16}" width="{width:.1f}" height="18" rx="9" class="bar"/>'
            f'<text x="484" y="{y}" class="value">{int(row["contracts"])}</text>'
        )

    metric_cards = [
        (720, 168, str(metrics.visible_contracts), "Visible Contracts"),
        (920, 168, f"{metrics.completion_rate:.0f}%", "Completion Rate"),
        (720, 292, str(metrics.privacy_score), "Privacy Score"),
        (920, 292, f"{metrics.reputation:.1f}", "Reputation"),
        (720, 416, f"{metrics.state_entropy_bits:.2f}", "State Entropy"),
        (920, 416, f"{metrics.activity_trend_slope:+.2f}", "Activity Trend"),
    ]
    cards = "".join(
        f'<rect x="{x}" y="{y}" width="176" height="98" rx="22" class="metric"/>'
        f'<text x="{x + 28}" y="{y + 54}" class="metricText">{value}</text>'
        f'<text x="{x + 28}" y="{y + 82}" class="metricLabel">{label}</text>'
        for x, y, value, label in metric_cards
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
    .bar {{ fill: {bar_color}; }}
    .metric {{ fill: #eef2ff; stroke: #c7d2fe; stroke-width: 2; }}
    .metricText {{ fill: #312e81; font: 700 30px system-ui, -apple-system, sans-serif; }}
    .metricLabel {{ fill: #4338ca; font: 600 15px system-ui, -apple-system, sans-serif; }}
  </style>
  <rect width="1200" height="675" class="bg"/>
  <rect x="36" y="36" width="1128" height="603" rx="28" class="panel"/>
  <text x="72" y="100" class="title">Privacy-Safe Wallet Analytics</text>
  <text x="72" y="136" class="body">Public contract state, local app preferences, and reputation summaries without private-wallet scraping.</text>
  <g>{"".join(rows)}</g>
  {cards}
  <text x="72" y="586" class="body">SciPy, Pandas, Seaborn, Bokeh, Plotly, NumPy, SymPy, and Matplotlib power these generated artifacts.</text>
</svg>
"""


def build_report(frame: pd.DataFrame, metrics: AnalyticsMetrics) -> dict[str, object]:
    """Build a deterministic machine-readable scientific analytics report."""

    enriched = frame.assign(sharePct=(frame["contracts"] / frame["contracts"].sum() * 100).round(2))
    return {
        "title": "TrustLedger Wallet Analytics Scientific Report",
        "privacyBoundary": [
            "No private keys",
            "No seed phrases",
            "No emails",
            "No raw documents",
            "No encrypted draft bodies",
            "No traffic tracking without explicit instrumentation",
        ],
        "libraries": {
            "bokeh": "dashboard-ready browser visualization specs",
            "matplotlib": "deterministic SVG rendering",
            "numpy": "vectorized status arrays",
            "pandas": "tabular contract-state frames",
            "plotly": "interactive frontend-ready chart specs",
            "scipy": "entropy, z-score, and trend statistics",
            "seaborn": "accessible statistical color palettes",
            "sympy": "exact completion-rate arithmetic",
        },
        "metrics": {
            "visibleContracts": metrics.visible_contracts,
            "completionRatePct": round(metrics.completion_rate, 2),
            "privacyScore": metrics.privacy_score,
            "reputation": metrics.reputation,
            "stateEntropyBits": metrics.state_entropy_bits,
            "activityTrendSlope": metrics.activity_trend_slope,
            "maxStatusZScore": metrics.max_status_zscore,
        },
        "rows": enriched.to_dict(orient="records"),
    }


def build_plotly_spec(frame: pd.DataFrame, metrics: AnalyticsMetrics) -> dict[str, object]:
    """Build a deterministic Plotly figure spec for future frontend embedding."""

    figure = go.Figure(
        data=[
            go.Bar(
                x=frame["status"],
                y=frame["contracts"],
                marker={"color": analytics_palette()},
                hovertemplate="%{x}: %{y} contracts<extra></extra>",
            )
        ],
        layout={
            "annotations": [
                {
                    "showarrow": False,
                    "text": f"Completion Rate: {metrics.completion_rate:.0f}%",
                    "x": 1,
                    "xref": "paper",
                    "y": 1.12,
                    "yref": "paper",
                }
            ],
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(0,0,0,0)",
            "template": "plotly_white",
            "title": {"text": "TrustLedger Wallet Contract States", "x": 0.02},
        },
    )
    return figure.to_plotly_json()


def build_bokeh_spec(frame: pd.DataFrame, metrics: AnalyticsMetrics) -> dict[str, object]:
    """Build a deterministic Bokeh-compatible source spec."""

    source = ColumnDataSource(
        data={
            "color": Viridis6,
            "contracts": frame["contracts"].astype(int).tolist(),
            "status": frame["status"].tolist(),
        }
    )
    return {
        "data": source.data,
        "summary": {
            "completionRatePct": round(metrics.completion_rate, 2),
            "privacyScore": metrics.privacy_score,
            "stateEntropyBits": metrics.state_entropy_bits,
        },
        "title": "TrustLedger Wallet State Source",
        "tooltips": [["Status", "@status"], ["Contracts", "@contracts"]],
        "type": "bokeh-column-data-source",
    }


def generate_artifacts() -> dict[pathlib.Path, str]:
    """Generate every deterministic analytics artifact."""

    PROJECT_TMP.mkdir(parents=True, exist_ok=True)
    frame = build_wallet_frame()
    metrics = derive_metrics(frame)
    return {
        DEFAULT_OUTPUT: build_svg(frame, metrics),
        DEFAULT_REPORT_OUTPUT: json.dumps(build_report(frame, metrics), indent=2, sort_keys=True)
        + "\n",
        DEFAULT_FRONTEND_REPORT_OUTPUT: json.dumps(
            build_report(frame, metrics), indent="\t", sort_keys=True
        )
        + "\n",
        DEFAULT_PLOTLY_OUTPUT: json.dumps(
            build_plotly_spec(frame, metrics),
            cls=PlotlyJSONEncoder,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        DEFAULT_BOKEH_OUTPUT: json.dumps(build_bokeh_spec(frame, metrics), indent=2, sort_keys=True)
        + "\n",
    }


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report-output", type=pathlib.Path, default=DEFAULT_REPORT_OUTPUT)
    parser.add_argument(
        "--frontend-report-output",
        type=pathlib.Path,
        default=DEFAULT_FRONTEND_REPORT_OUTPUT,
    )
    parser.add_argument("--plotly-output", type=pathlib.Path, default=DEFAULT_PLOTLY_OUTPUT)
    parser.add_argument("--bokeh-output", type=pathlib.Path, default=DEFAULT_BOKEH_OUTPUT)
    parser.add_argument("--check", action="store_true")
    return parser.parse_args()


def main() -> int:
    """CLI entrypoint."""

    args = parse_args()
    generated = generate_artifacts()
    artifacts = {
        args.output: generated[DEFAULT_OUTPUT],
        args.report_output: generated[DEFAULT_REPORT_OUTPUT],
        args.frontend_report_output: generated[DEFAULT_FRONTEND_REPORT_OUTPUT],
        args.plotly_output: generated[DEFAULT_PLOTLY_OUTPUT],
        args.bokeh_output: generated[DEFAULT_BOKEH_OUTPUT],
    }

    if args.check:
        stale = []
        for path, content in artifacts.items():
            existing = path.read_text(encoding="utf-8") if path.exists() else ""
            if existing != content:
                stale.append(path)
        if stale:
            for path in stale:
                print(f"{path} is stale. Run npm run analytics:generate.", file=sys.stderr)
            return 1
        print("Analytics artifacts are up to date.")
        return 0

    for path, content in artifacts.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        print(f"Wrote {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
