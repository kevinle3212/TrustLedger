"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

/** One slice of a donut breakdown. `name` is already localized by the caller. */
export interface BreakdownSlice {
	readonly name: string;
	readonly value: number;
	readonly color: string;
}

const EMPTY_SLICE = { name: "empty", value: 1, fill: "#e5e7eb" } as const;

/**
 * Responsive, interactive donut chart (Recharts) for share/breakdown views
 * (role mix, asset allocation, outcome split).
 *
 * Client-only. The accessible name comes from `ariaLabel` (translated by the
 * caller); slice names/colors are passed in, so there is no hard-coded copy.
 */
export function BreakdownDonut({
	data,
	ariaLabel,
	height = 200,
}: {
	readonly data: readonly BreakdownSlice[];
	readonly ariaLabel: string;
	readonly height?: number;
}): React.JSX.Element {
	const hasData = data.some((slice) => slice.value > 0);
	// Recharts colors each sector from its datum's `fill`, so no per-cell child is needed.
	const slices = hasData ? data.map((slice) => ({ ...slice, fill: slice.color })) : [EMPTY_SLICE];
	return (
		<div role="img" aria-label={ariaLabel} style={{ width: "100%", height }}>
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						data={slices}
						dataKey="value"
						nameKey="name"
						innerRadius="60%"
						outerRadius="90%"
						paddingAngle={hasData ? 2 : 0}
						stroke="none"
						isAnimationActive={false}
					/>
					{hasData ? (
						<Tooltip
							contentStyle={{
								borderRadius: 12,
								border: "1px solid rgba(120,120,120,0.25)",
								fontSize: 12,
							}}
						/>
					) : null}
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}
