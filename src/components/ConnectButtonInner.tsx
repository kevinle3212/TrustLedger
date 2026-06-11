"use client";

import { useAppKit, useAppKitTheme } from "@reown/appkit/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
	const [walletMenuOpen, setWalletMenuOpen] = useState(false);
	const lastOpenedKeyRef = useRef(0);
	const walletMenuRef = useRef<HTMLDivElement>(null);

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

	useEffect(() => {
		function closeOnOutsideClick(event: MouseEvent): void {
			if (
				walletMenuRef.current !== null &&
				event.target instanceof Node &&
				!walletMenuRef.current.contains(event.target)
			) {
				setWalletMenuOpen(false);
			}
		}

		function closeOnEscape(event: KeyboardEvent): void {
			if (event.key === "Escape") {
				setWalletMenuOpen(false);
			}
		}

		document.addEventListener("mousedown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		return (): void => {
			document.removeEventListener("mousedown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, []);

	function openModal(): void {
		void open();
	}

	function openWalletModal(): void {
		setWalletMenuOpen(false);
		openModal();
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
		const menuVisibility = walletMenuOpen
			? "pointer-events-auto translate-y-0 opacity-100"
			: "pointer-events-none translate-y-1 opacity-0";

		return (
			<div
				ref={walletMenuRef}
				className="relative max-w-full shrink-0"
				onPointerEnter={() => {
					setWalletMenuOpen(true);
				}}
				onPointerLeave={() => {
					setWalletMenuOpen(false);
				}}
				onFocus={() => {
					setWalletMenuOpen(true);
				}}
			>
				<div className="grid max-w-full grid-cols-[minmax(0,1fr)_2.5rem] items-stretch overflow-hidden rounded-lg bg-indigo-600 text-white sm:inline-grid sm:grid-cols-[minmax(0,1fr)_2.75rem]">
					<button
						type="button"
						onClick={() => {
							setWalletMenuOpen((value) => !value);
						}}
						aria-haspopup="menu"
						aria-expanded={walletMenuOpen}
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
				<div
					role="menu"
					aria-label={t("walletMenu")}
					className={`absolute right-0 top-full z-50 mt-2 w-64 transition duration-150 ease-out ${menuVisibility}`}
				>
					<div className="rounded-xl border border-gray-200 bg-white p-2 text-gray-900 shadow-lg shadow-gray-950/10 dark:border-white/10 dark:bg-gray-950 dark:text-white">
						<Link
							href="/dashboard"
							role="menuitem"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("dashboard")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/analytics"
							role="menuitem"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("analytics")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/create"
							role="menuitem"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("createContract")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/reputation"
							role="menuitem"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("reputation")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/account"
							role="menuitem"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("account")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/status"
							role="menuitem"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("status")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<Link
							href="/about"
							role="menuitem"
							className="tl-button-motion flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
						>
							<span>{t("about")}</span>
							<span aria-hidden="true">→</span>
						</Link>
						<button
							type="button"
							role="menuitem"
							onClick={openWalletModal}
							className="tl-button-motion mt-1 flex min-h-10 w-full items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-sm font-semibold text-indigo-800 hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-100 dark:hover:bg-indigo-400/20"
						>
							<span>{t("manageWallet")}</span>
							<span aria-hidden="true">↗</span>
						</button>
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
