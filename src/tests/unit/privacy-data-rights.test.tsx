import { fireEvent, render, screen } from "@testing-library/react";

import { PrivacyDataRights } from "@/components/PrivacyDataRights";
import { clearLocalPersonalData } from "@/lib/personalData";

const disconnect = jest.fn();

jest.mock("wagmi", () => ({
	useAccount: (): { address: string } => ({ address: "0xabc" }),
	useDisconnect: (): { disconnect: () => void } => ({ disconnect }),
}));

jest.mock("@/lib/personalData", () => ({
	buildPersonalDataExport: jest.fn(() => ({})),
	clearLocalPersonalData: jest.fn(),
}));

describe("PrivacyDataRights", () => {
	beforeEach(() => {
		disconnect.mockClear();
		(clearLocalPersonalData as jest.Mock).mockClear();
	});

	it("requires an explicit confirmation before erasing data", () => {
		render(<PrivacyDataRights />);

		// No confirmation dialog until the delete button is pressed.
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "deleteButton" }));

		// The immutable-blockchain warning must be shown before erasing anything.
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(clearLocalPersonalData).not.toHaveBeenCalled();
	});

	it("clears local data and disconnects the wallet on confirmation", () => {
		render(<PrivacyDataRights />);

		fireEvent.click(screen.getByRole("button", { name: "deleteButton" }));
		fireEvent.click(screen.getByRole("button", { name: "deleteConfirmAction" }));

		expect(clearLocalPersonalData).toHaveBeenCalledTimes(1);
		expect(disconnect).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("deleteDone");
	});

	it("cancels the deletion without touching stored data", () => {
		render(<PrivacyDataRights />);

		fireEvent.click(screen.getByRole("button", { name: "deleteButton" }));
		fireEvent.click(screen.getByRole("button", { name: "deleteCancelAction" }));

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(clearLocalPersonalData).not.toHaveBeenCalled();
		expect(disconnect).not.toHaveBeenCalled();
	});
});
