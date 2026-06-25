"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

/** One point on a trend line. `label` is the (already-localized) x-axis tick. */
export interface TrendPoint {
	readonly label: string;
	readonly value: number;
}

/**
 * Responsive, interactive line chart (Recharts) for activity/portfolio trends.
 *
 * Client-only: Recharts renders to the DOM and needs a sized container. The
 * accessible name comes from `ariaLabel` (a translated string supplied by the
 * caller) so this component contains no hard-coded visible copy.
 */
export function TrendLineChart({
	data,
	ariaLabel,
	color = "#6366f1",
	height = 240,
}: {
	readonly data: readonly TrendPoint[];
	readonly ariaLabel: string;
	readonly color?: string;
	readonly height?: number;
}): React.JSX.Element {
	return (
		<div role="img" aria-label={ariaLabel} style={{ width: "100%", height }}>
			{/* Seed the known height so the first render (before the container is
			    measured) never falls back to Recharts' -1×-1 default, which both
			    avoids a mis-sized first paint and silences the dimension warning. */}
			<ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 0, height }}>
				<LineChart data={[...data]} margin={{ top: 8, right: 16, bottom: 8, left: -16 }}>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="currentColor"
						strokeOpacity={0.12}
					/>
					<XAxis
						dataKey="label"
						tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
						tickLine={false}
						axisLine={false}
						interval="preserveStartEnd"
					/>
					<YAxis
						allowDecimals={false}
						width={40}
						tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
						tickLine={false}
						axisLine={false}
					/>
					<Tooltip
						cursor={{ stroke: color, strokeOpacity: 0.3 }}
						contentStyle={{
							borderRadius: 12,
							border: "1px solid rgba(120,120,120,0.25)",
							fontSize: 12,
						}}
					/>
					<Line
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={3}
						dot={{ r: 4, strokeWidth: 2 }}
						activeDot={{ r: 6 }}
						isAnimationActive={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
