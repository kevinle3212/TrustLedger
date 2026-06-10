import { act, render } from "@testing-library/react";

import { useInactivityLogout } from "@/lib/useInactivityLogout";

const mockUseAccount = jest.fn();
const mockUseDisconnect = jest.fn();
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;

jest.mock("wagmi", () => ({
	useAccount: (): { isConnected: boolean } => mockUseAccount() as { isConnected: boolean },
	useDisconnect: (): { disconnect: jest.Mock } =>
		mockUseDisconnect() as { disconnect: jest.Mock },
}));

function InactivityHarness(): null {
	useInactivityLogout();
	return null;
}

describe("useInactivityLogout", () => {
	let disconnect: jest.Mock;

	beforeEach(() => {
		jest.useFakeTimers();
		disconnect = jest.fn();
		mockUseAccount.mockReturnValue({ isConnected: true });
		mockUseDisconnect.mockReturnValue({ disconnect });
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it("disconnects a connected wallet after the inactivity limit", () => {
		render(<InactivityHarness />);

		act(() => {
			jest.advanceTimersByTime(INACTIVITY_LIMIT_MS);
		});

		expect(disconnect).toHaveBeenCalledTimes(1);
	});

	it("resets the logout timer after user activity", () => {
		render(<InactivityHarness />);

		act(() => {
			jest.advanceTimersByTime(INACTIVITY_LIMIT_MS - 1000);
			window.dispatchEvent(new Event("click"));
			jest.advanceTimersByTime(INACTIVITY_LIMIT_MS - 1);
		});

		expect(disconnect).not.toHaveBeenCalled();

		act(() => {
			jest.advanceTimersByTime(1);
		});

		expect(disconnect).toHaveBeenCalledTimes(1);
	});

	it("does not start a logout timer when no wallet is connected", () => {
		mockUseAccount.mockReturnValue({ isConnected: false });

		render(<InactivityHarness />);

		act(() => {
			jest.advanceTimersByTime(INACTIVITY_LIMIT_MS);
		});

		expect(disconnect).not.toHaveBeenCalled();
	});
});
