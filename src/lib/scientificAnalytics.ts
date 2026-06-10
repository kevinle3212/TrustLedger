import report from "../../assets/analytics/wallet-analytics-report.json";

interface ScientificAnalyticsArtifact {
	readonly label: string;
	readonly path: string;
	readonly format: "json" | "svg";
	readonly purpose: string;
}

export interface ScientificAnalyticsManifest {
	readonly title: string;
	readonly privacyBoundary: readonly string[];
	readonly libraries: Record<string, string>;
	readonly metrics: Record<string, number>;
	readonly artifacts: readonly ScientificAnalyticsArtifact[];
}

const ARTIFACTS: readonly ScientificAnalyticsArtifact[] = [
	{
		label: "Wallet Analytics Preview",
		path: "assets/analytics/wallet-analytics-preview.svg",
		format: "svg",
		purpose: "Static preview for docs, social decks, and visual regression review.",
	},
	{
		label: "Scientific Report",
		path: "assets/analytics/wallet-analytics-report.json",
		format: "json",
		purpose: "Machine-readable metrics derived with Pandas, SciPy, SymPy, and NumPy.",
	},
	{
		label: "Plotly Chart Spec",
		path: "assets/analytics/wallet-analytics-plotly.json",
		format: "json",
		purpose: "Interactive chart spec for future frontend or admin embedding.",
	},
	{
		label: "Bokeh Source Spec",
		path: "assets/analytics/wallet-analytics-bokeh.json",
		format: "json",
		purpose: "Dashboard-ready data source for Bokeh-backed operator views.",
	},
];

export function buildScientificAnalyticsManifest(): ScientificAnalyticsManifest {
	return {
		title: report.title,
		privacyBoundary: report.privacyBoundary,
		libraries: report.libraries,
		metrics: report.metrics,
		artifacts: ARTIFACTS,
	};
}
