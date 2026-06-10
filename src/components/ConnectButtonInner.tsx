"use client";

import { useAppKit, useAppKitTheme } from "@reown/appkit/react";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getLastWallet, setLastWallet } from "@/lib/lastWallet";
import { formatAddress } from "@/lib/utils";
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
 * - Connected: the truncated address (opens AppKit for account/network actions)
 *   plus a copy-to-clipboard button for the full public address.
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
	const [copied, setCopied] = useState(false);

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
		if (!mounted || openOnLoadKey === 0) return;
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
		const copyAddress = (): void => {
			void navigator.clipboard.writeText(address).then(() => {
				setCopied(true);
				setTimeout(() => {
					setCopied(false);
				}, 1500);
			});
		};

		return (
			<div className="group/wallet relative max-w-full shrink-0">
				<div className="grid max-w-full grid-cols-[minmax(0,1fr)_2.5rem] items-stretch overflow-hidden rounded-lg bg-indigo-600 text-white sm:inline-grid sm:grid-cols-[minmax(0,1fr)_2.75rem]">
					<button
						type="button"
						onClick={openModal}
						aria-label={t("connectedAs", { address })}
						className={`tl-button-motion inline-flex min-h-10 min-w-0 items-center justify-center py-2 font-mono text-sm font-semibold hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-11 ${
							compact ? "px-3 sm:px-3.5" : "px-4 sm:px-5"
						}`}
					>
						<span aria-hidden="true" className="truncate">
							{formatAddress(address)}
						</span>
					</button>
					<button
						type="button"
						onClick={copyAddress}
						aria-label={copied ? t("addressCopied") : t("copyWalletAddress")}
						title={copied ? t("copied") : t("copyAddress")}
						className="tl-button-motion inline-flex min-h-10 w-10 shrink-0 items-center justify-center border-l border-white/20 text-white/90 hover:bg-indigo-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-11 sm:w-11"
					>
						{copied ? <CheckIcon /> : <CopyIcon />}
					</button>
				</div>
				<div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-60 translate-y-1 opacity-0 transition duration-150 ease-out group-hover/wallet:pointer-events-auto group-hover/wallet:translate-y-0 group-hover/wallet:opacity-100 group-focus-within/wallet:pointer-events-auto group-focus-within/wallet:translate-y-0 group-focus-within/wallet:opacity-100">
					<div className="rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg shadow-gray-950/10 dark:border-white/10 dark:bg-gray-950 dark:text-white">
						<Link
							href="/analytics"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("analytics")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/account"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("account")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/status"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("status")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/about"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("about")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<p className="px-3 pb-2 pt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
							{t("walletMenuHint")}
						</p>
					</div>
				</div>
			</div>
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
