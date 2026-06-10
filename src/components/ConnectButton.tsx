"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { useTranslations } from "next-intl";
import { getLastWallet, setLastWallet } from "@/lib/lastWallet";
import { formatAddress } from "@/lib/utils";

const WalletButton = dynamic(
	async () => {
		const mod = await import("@/components/ConnectButtonInner");
		return { default: mod.ConnectButtonInner };
	},
	{
		ssr: false,
		loading: () => <ConnectButtonShell compact />,
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
	label,
}: {
	compact?: boolean;
	onClick?: () => void;
	label?: string;
}): React.JSX.Element {
	const t = useTranslations("Common");
	const className =
		"tl-button-motion inline-flex min-h-10 max-w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-[44px] sm:px-4";
	const text = label ?? t("connectWallet");

	return (
		<button
			type="button"
			onClick={onClick}
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

export function ConnectButton({ compact = false }: { compact?: boolean } = {}): React.JSX.Element {
	const [loadWalletUi, setLoadWalletUi] = useState(false);
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
		setLoadWalletUi(true);
		setOpenOnLoadKey((value) => value + 1);
	}

	if (!loadWalletUi) {
		const remembered = mounted ? getLastWallet() : null;
		const label =
			mounted && isConnected && address !== undefined
				? formatAddress(address)
				: remembered !== null && remembered !== ""
					? t("reconnectWith", { wallet: remembered })
					: t("connectWallet");
		return <ConnectButtonShell compact={compact} onClick={loadAndOpen} label={label} />;
	}

	return <WalletButton compact={compact} openOnLoadKey={openOnLoadKey} />;
}
