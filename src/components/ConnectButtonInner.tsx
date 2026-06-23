"use client";

import { useAppKit, useAppKitTheme } from "@reown/appkit/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";
import { ConnectedWalletMenu } from "@/components/ConnectedWalletMenu";
import { getLastWallet, setLastWallet } from "@/lib/lastWallet";
import { APPKIT_FONT_FAMILY } from "@/lib/wagmi";
import { ensureAppKit } from "@/lib/appkit";

ensureAppKit();

/** Wallet glyph for connect/reconnect calls to action. */
function WalletIcon(): React.JSX.Element {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M19 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
			<path d="M16 13h.01" />
		</svg>
	);
}

const BUTTON_CLASS =
	"tl-button-motion inline-flex min-h-10 max-w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-[44px] sm:px-4";

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
 * - Connected: the shared {@link ConnectedWalletMenu} (truncated address, copy
 *   button, navigation dropdown) with "Manage Wallet" wired to the AppKit modal.
 *
 * A `mounted` gate ensures the first client render matches the server render
 * ("Connect Wallet"), avoiding the React #418 hydration mismatch that occurred
 * when wagmi rehydrated `isConnected` from storage before hydration completed.
 */
export function ConnectButtonInner({
	compact = false,
	openOnLoadKey = 0,
}: {
	compact?: boolean;
	openOnLoadKey?: number;
} = {}): React.JSX.Element {
	const { open } = useAppKit();
	const { resolvedTheme } = useTheme();
	const { setThemeMode, setThemeVariables } = useAppKitTheme();
	const { address, isConnected, connector } = useAccount();
	const t = useTranslations("Common");

	const mounted = useMounted();
	const lastOpenedKeyRef = useRef(0);

	// Persist the connector label (localStorage only - no React state) whenever a
	// connection is active, so the reconnect hint survives logout / session expiry.
	useEffect(() => {
		const name = connector?.name;
		if (mounted && isConnected && name !== undefined && name !== "") {
			setLastWallet(name);
		}
	}, [isConnected, mounted, connector?.name]);

	useEffect(() => {
		setThemeMode(resolvedTheme === "light" ? "light" : "dark");
		setThemeVariables({
			"--w3m-accent": "#6366f1",
			"--w3m-font-family": APPKIT_FONT_FAMILY,
		});
	}, [resolvedTheme, setThemeMode, setThemeVariables]);

	useEffect(() => {
		if (!mounted || openOnLoadKey === 0 || lastOpenedKeyRef.current === openOnLoadKey) {
			return;
		}
		lastOpenedKeyRef.current = openOnLoadKey;
		void open();
	}, [mounted, open, openOnLoadKey]);

	function openModal(): void {
		void open();
	}

	// Until mounted, render the deterministic server markup to avoid #418.
	if (!mounted) {
		return (
			<button
				type="button"
				onClick={openModal}
				className={compact ? `${BUTTON_CLASS} sm:px-3` : BUTTON_CLASS}
			>
				<WalletIcon />
				<span className={compact ? "max-w-[8rem] truncate sm:max-w-[9rem]" : "truncate"}>
					{t("connectWallet")}
				</span>
			</button>
		);
	}

	if (isConnected && address !== undefined) {
		return (
			<ConnectedWalletMenu address={address} compact={compact} onManageWallet={openModal} />
		);
	}

	// Reached only when mounted, so reading localStorage here is client-safe.
	const remembered = getLastWallet();
	const label =
		remembered !== null && remembered !== ""
			? t("reconnectWith", { wallet: remembered })
			: t("connectWallet");

	return (
		<button
			type="button"
			onClick={openModal}
			className={compact ? `${BUTTON_CLASS} sm:px-3` : BUTTON_CLASS}
		>
			<WalletIcon />
			<span
				className={
					compact
						? "max-w-[8rem] truncate sm:max-w-[9rem]"
						: "max-w-[12rem] truncate sm:max-w-[14rem]"
				}
			>
				{label}
			</span>
		</button>
	);
}
