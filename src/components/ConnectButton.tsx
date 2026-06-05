"use client";

import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

/**
 * App-wide wallet connect button backed by Reown AppKit.
 *
 * Renders "Connect Wallet" when disconnected and a truncated address when
 * connected; clicking opens the AppKit modal (account + network management when
 * connected, wallet picker otherwise). Replaces RainbowKit's `<ConnectButton>`.
 */
export function ConnectButton(): React.JSX.Element {
	const { open } = useAppKit();
	const { address, isConnected } = useAppKitAccount();

	const label =
		isConnected && address !== undefined
			? `${address.slice(0, 6)}…${address.slice(-4)}`
			: "Connect Wallet";

	return (
		<button
			type="button"
			onClick={() => {
				void open();
			}}
			className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
		>
			{label}
		</button>
	);
}
