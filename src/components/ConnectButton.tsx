"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type * as ConnectButtonInnerModule from "@/components/ConnectButtonInner";
import { getLastWallet, setLastWallet } from "@/lib/lastWallet";
import { formatAddress } from "@/lib/utils";
import { copyToClipboard } from "@/security/clipboard";

let walletButtonPreload: Promise<typeof ConnectButtonInnerModule> | null = null;

async function preloadWalletButton(): Promise<typeof ConnectButtonInnerModule> {
	walletButtonPreload ??= import("@/components/ConnectButtonInner");
	return await walletButtonPreload;
}

function prepareWalletUi(): void {
	void preloadWalletButton();
}

function WalletButtonLoading(): React.JSX.Element {
	const t = useTranslations("Common");
	return <ConnectButtonShell compact label={t("openingWallet")} busy />;
}

const WalletButton = dynamic(
	async () => {
		const mod = await preloadWalletButton();
		return { default: mod.ConnectButtonInner };
	},
	{
		ssr: false,
		loading: () => <WalletButtonLoading />,
	},
);

const subscribeNoop = (): (() => void) => (): void => undefined;

function useMounted(): boolean {
	return useSyncExternalStore(
		subscribeNoop,
		() => true,
		() => false,
	);
}

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

function ConnectButtonShell({
	compact = false,
	onClick,
	onPrepare,
	label,
	busy = false,
}: {
	compact?: boolean;
	onClick?: () => void;
	onPrepare?: () => void;
	label?: string;
	busy?: boolean;
}): React.JSX.Element {
	const t = useTranslations("Common");
	const className =
		"tl-button-motion inline-flex min-h-10 max-w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-[44px] sm:px-4";
	const text = label ?? t("connectWallet");

	return (
		<button
			type="button"
			aria-busy={busy}
			onClick={onClick}
			onFocus={onPrepare}
			onPointerEnter={onPrepare}
			onTouchStart={onPrepare}
			className={compact ? `${className} sm:px-3` : className}
		>
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
			<span className={compact ? "max-w-[8rem] truncate sm:max-w-[9rem]" : "truncate"}>
				{text}
			</span>
		</button>
	);
}

function ConnectedWalletMenu({
	address,
	compact,
	onManageWallet,
}: {
	address: `0x${string}`;
	compact: boolean;
	onManageWallet: () => void;
}): React.JSX.Element {
	const t = useTranslations("Common");
	const [copied, setCopied] = useState(false);
	const [walletMenuOpen, setWalletMenuOpen] = useState(false);
	const walletMenuRef = useRef<HTMLDivElement>(null);
	const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const clearCopyFeedbackTimer = useCallback((): void => {
		if (copyFeedbackTimerRef.current !== null) {
			clearTimeout(copyFeedbackTimerRef.current);
			copyFeedbackTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		return clearCopyFeedbackTimer;
	}, [clearCopyFeedbackTimer]);

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

	function openWalletMenu(): void {
		setWalletMenuOpen(true);
	}

	function copyAddress(): void {
		// copyToClipboard is best-effort and never throws/rejects (safe on insecure
		// origins and in-app webviews where navigator.clipboard is undefined).
		void copyToClipboard(address).then((ok) => {
			if (!ok) return;
			setCopied(true);
			clearCopyFeedbackTimer();
			copyFeedbackTimerRef.current = setTimeout(() => {
				setCopied(false);
				copyFeedbackTimerRef.current = null;
			}, 1500);
		});
	}

	function manageWallet(): void {
		setWalletMenuOpen(false);
		onManageWallet();
	}

	const menuVisibility = walletMenuOpen
		? "pointer-events-auto translate-y-0 opacity-100"
		: "pointer-events-none translate-y-1 opacity-0";

	return (
		<div
			ref={walletMenuRef}
			className="relative max-w-full shrink-0"
			onPointerEnter={openWalletMenu}
			onMouseEnter={openWalletMenu}
			onPointerLeave={() => {
				setWalletMenuOpen(false);
			}}
			onMouseLeave={() => {
				setWalletMenuOpen(false);
			}}
			onFocus={openWalletMenu}
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
				className={`absolute right-0 top-full z-50 w-64 pt-2 transition duration-150 ease-out ${menuVisibility}`}
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
						onClick={manageWallet}
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

export function ConnectButton({ compact = false }: { compact?: boolean } = {}): React.JSX.Element {
	const [loadWalletUi, setLoadWalletUi] = useState(false);
	const [loadingWalletUi, setLoadingWalletUi] = useState(false);
	const [openOnLoadKey, setOpenOnLoadKey] = useState(0);
	const { address, isConnected, connector } = useAccount();
	const t = useTranslations("Common");
	const mounted = useMounted();

	useEffect(() => {
		const name = connector?.name;
		if (mounted && isConnected && name !== undefined && name !== "") {
			setLastWallet(name);
		}
	}, [isConnected, mounted, connector?.name]);

	function loadAndOpen(): void {
		setLoadingWalletUi(true);
		setLoadWalletUi(true);
		setOpenOnLoadKey((value) => value + 1);
	}

	const shouldLoadWalletUi = loadWalletUi;
	const shellLabel = loadingWalletUi ? t("openingWallet") : undefined;

	if (mounted && isConnected && address !== undefined && !shouldLoadWalletUi) {
		return (
			<ConnectedWalletMenu address={address} compact={compact} onManageWallet={loadAndOpen} />
		);
	}

	if (!shouldLoadWalletUi) {
		const remembered = mounted ? getLastWallet() : null;
		const label =
			mounted && isConnected && address !== undefined
				? formatAddress(address)
				: remembered !== null && remembered !== ""
					? t("reconnectWith", { wallet: remembered })
					: t("connectWallet");
		return (
			<ConnectButtonShell
				compact={compact}
				onClick={loadAndOpen}
				onPrepare={prepareWalletUi}
				label={shellLabel ?? label}
				busy={loadingWalletUi}
			/>
		);
	}

	return <WalletButton compact={compact} openOnLoadKey={openOnLoadKey} />;
}
