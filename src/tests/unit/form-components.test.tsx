import { render, screen } from "@testing-library/react";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";

describe("form primitives", () => {
	it("binds Field label to nested Input and renders hint text", () => {
		render(
			<Field label="Client wallet" hint="Used for escrow funding.">
				<Input placeholder="0x..." />
			</Field>,
		);

		const input = screen.getByLabelText("Client wallet");
		expect(input).toHaveAttribute("placeholder", "0x...");
		expect(input).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByText("Used for escrow funding.")).toBeInTheDocument();
	});

	it("renders error state and hides hint when Field has an error", () => {
		render(
			<Field label="Amount" hint="Held in escrow." error="Amount is required.">
				<Input error />
			</Field>,
		);

		expect(screen.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("alert")).toHaveTextContent("Amount is required.");
		expect(screen.queryByText("Held in escrow.")).not.toBeInTheDocument();
	});

	it("keeps Field label binding when a child control also receives an id", () => {
		render(
			<Field label="Payment token">
				<Select id="payment-token" defaultValue="eth">
					<option value="eth">ETH</option>
					<option value="usdc">USDC</option>
				</Select>
			</Field>,
		);

		expect(screen.getByLabelText("Payment token")).not.toHaveAttribute("id", "payment-token");
		expect(screen.getByRole("combobox")).toHaveValue("eth");
	});
});
