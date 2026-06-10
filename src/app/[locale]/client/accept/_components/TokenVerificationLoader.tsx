"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { WalletRequiredPage } from "@/components/WalletRequiredPage";
import type { MagicLinkPayload } from "@/lib/magicLink";
import { useTranslations } from "next-intl";

function Shell({ children }: { children: React.ReactNode }): React.JSX.Element {
	return <div className="max-w-lg mx-auto px-6 py-16 flex flex-col gap-4">{children}</div>;
}

interface Props {
	tokenError: string | null;
	isConnected: boolean;
	address: string | undefined;
	payload: MagicLinkPayload | null;
	contractLoading: boolean;
	contract: unknown;
	children: React.ReactNode;
}

/** Renders guard states for token verification and wallet checks; passes through to children when all clear. */
export function TokenVerificationLoader({
	tokenError,
	isConnected,
	address,
	payload,
	contractLoading,
	contract,
	children,
}: Props): React.JSX.Element {
	const t = useTranslations("Client");

	if (tokenError !== null)
		return (
			<Shell>
				<div className="rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-5 text-center">
					<p className="text-red-500 dark:text-red-400 font-semibold mb-1">
						{t("invalidLink")}
					</p>
					<p className="text-gray-500 dark:text-gray-400 text-sm">{tokenError}</p>
				</div>
			</Shell>
		);

	if (!isConnected) return <WalletRequiredPage />;

	const expectedAddress = payload?.clientAddress.toLowerCase();
	if (address?.toLowerCase() !== expectedAddress)
		return (
			<Shell>
				<div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-6 py-5">
					<p className="text-yellow-600 dark:text-yellow-400 font-semibold mb-1">
						{t("wrongWallet")}
					</p>
					<p className="text-gray-500 dark:text-gray-400 text-sm">
						{t("wrongWalletDesc", { address: payload?.clientAddress ?? "" })}
					</p>
				</div>
				<div className="mt-4">
					<ConnectButton />
				</div>
			</Shell>
		);

	if (contractLoading || contract === undefined)
		return (
			<Shell>
				<p className="text-gray-500 dark:text-gray-400">{t("loadingContract")}</p>
			</Shell>
		);

	return <>{children}</>;
}
