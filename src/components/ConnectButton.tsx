"use client";

import { useAppKit } from "@reown/appkit/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { getLastWallet, setLastWallet } from "@/lib/lastWallet";
import { formatAddress } from "@/lib/utils";

/** Clipboard "copy" glyph. */
function CopyIcon(): React.JSX.Element {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	);
}

/** Checkmark glyph shown briefly after a successful copy. */
function CheckIcon(): React.JSX.Element {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

const BUTTON_CLASS =
	"inline-flex items-center justify-center min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";

// Hydration-safe "are we on the client yet?" flag. useSyncExternalStore returns
// the server snapshot (false) during SSR and the first client render, then the
// client snapshot (true) afterwards - without a setState-in-effect mounted flag.
const subscribeNoop = (): (() => void) => (): void => undefined;
function useMounted(): boolean {
	return useSyncExternalStore(
		subscribeNoop,
		() => true,
		() => false,
	);
}

/**
 * App-wide wallet control backed by Reown AppKit + wagmi.
 *
 * - Disconnected: a "Connect Wallet" button (or "Reconnect with <Wallet>" when a
 *   previously used connector is remembered, see {@link getLastWallet}) that opens
 *   the AppKit modal.
 * - Connected: the truncated address (opens AppKit for account/network actions)
 *   plus a copy-to-clipboard button for the full public address.
 *
 * A `mounted` gate ensures the first client render matches the server render
 * ("Connect Wallet"), avoiding the React #418 hydration mismatch that occurred
 * when wagmi rehydrated `isConnected` from storage before hydration completed.
 */
export function ConnectButton(): React.JSX.Element {
	const { open } = useAppKit();
	const { address, isConnected, connector } = useAccount();

	const mounted = useMounted();
	const [copied, setCopied] = useState(false);

	// Persist the connector label (localStorage only - no React state) whenever a
	// connection is active, so the reconnect hint survives logout / session expiry.
	useEffect(() => {
		const name = connector?.name;
		if (isConnected && name !== undefined && name !== "") {
			setLastWallet(name);
		}
	}, [isConnected, connector]);

	function openModal(): void {
		void open();
	}

	// Until mounted, render the deterministic server markup to avoid #418.
	if (!mounted) {
		return (
			<button type="button" onClick={openModal} className={BUTTON_CLASS}>
				Connect Wallet
			</button>
		);
	}

	if (isConnected && address !== undefined) {
		const copyAddress = (): void => {
			void navigator.clipboard.writeText(address).then(() => {
				setCopied(true);
				setTimeout(() => {
					setCopied(false);
				}, 1500);
			});
		};

		return (
			<div className="inline-flex items-stretch overflow-hidden rounded-lg bg-indigo-600 text-white">
				<button
					type="button"
					onClick={openModal}
					className="inline-flex items-center min-h-[44px] px-4 py-2 text-sm font-medium font-mono transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
				>
					{formatAddress(address)}
				</button>
				<button
					type="button"
					onClick={copyAddress}
					aria-label={copied ? "Address copied" : "Copy wallet address"}
					title={copied ? "Copied!" : "Copy address"}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] border-l border-white/20 px-3 transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
				>
					{copied ? <CheckIcon /> : <CopyIcon />}
				</button>
			</div>
		);
	}

	// Reached only when mounted, so reading localStorage here is client-safe.
	const remembered = getLastWallet();
	const label =
		remembered !== null && remembered !== ""
			? `Reconnect with ${remembered}`
			: "Connect Wallet";

	return (
		<button type="button" onClick={openModal} className={BUTTON_CLASS}>
			{label}
		</button>
	);
}
