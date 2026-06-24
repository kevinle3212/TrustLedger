"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";
import type * as ConnectButtonInnerModule from "@/components/ConnectButtonInner";
import { ConnectedWalletMenu } from "@/components/ConnectedWalletMenu";
import { getLastWallet, setLastWallet } from "@/lib/lastWallet";
import { formatAddress } from "@/lib/utils";

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

/** Wallet connect/disconnect button. Set `compact` for icon-only display in tight layouts. */
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
