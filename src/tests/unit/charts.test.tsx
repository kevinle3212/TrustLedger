import { render, screen } from "@testing-library/react";

import { BreakdownDonut } from "@/components/charts/BreakdownDonut";
import { TrendLineChart } from "@/components/charts/TrendLineChart";

// Recharts' ResponsiveContainer relies on ResizeObserver, which jsdom lacks.
beforeAll(() => {
	globalThis.ResizeObserver = jest.fn(() => ({
		observe: (): void => undefined,
		unobserve: (): void => undefined,
		disconnect: (): void => undefined,
	}));
});

describe("chart wrappers", () => {
	it("exposes the trend line chart by its accessible name", () => {
		render(
			<TrendLineChart
				ariaLabel="Activity trend"
				data={[
					{ label: "Pending", value: 1 },
					{ label: "Active", value: 3 },
				]}
			/>,
		);
		expect(screen.getByRole("img", { name: "Activity trend" })).toBeInTheDocument();
	});

	it("renders the breakdown donut with and without data", () => {
		const { rerender } = render(
			<BreakdownDonut
				ariaLabel="Role mix"
				data={[
					{ name: "Client", value: 2, color: "#6366f1" },
					{ name: "Freelancer", value: 1, color: "#10b981" },
				]}
			/>,
		);
		expect(screen.getByRole("img", { name: "Role mix" })).toBeInTheDocument();

		rerender(
			<BreakdownDonut
				ariaLabel="Role mix"
				data={[
					{ name: "Client", value: 0, color: "#6366f1" },
					{ name: "Freelancer", value: 0, color: "#10b981" },
				]}
			/>,
		);
		expect(screen.getByRole("img", { name: "Role mix" })).toBeInTheDocument();
	});
});
