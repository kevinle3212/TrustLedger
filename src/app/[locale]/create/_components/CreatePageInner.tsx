"use client";

import { useCreatePageState } from "../_lib/useCreatePageState";
import { CreatePageControls, CreatePageHeader } from "./CreatePageControls";
import { CreatePageWorkspace } from "./CreatePageWorkspace";
import { CreateSuccessView } from "./CreateSuccessView";

export function CreatePageInner(): React.JSX.Element {
	const page = useCreatePageState();
	const {
		state,
		isClientProposing,
		txHash,
		solanaTxStatus,
		solanaSubmission,
		isSuccess,
		receipt,
	} = page;
	const { form, magicLinkStatus, paymentToken } = state;

	if (isSuccess && receipt !== undefined) {
		return (
			<CreateSuccessView
				txHash={txHash}
				blockNumber={receipt.blockNumber}
				isClientProposing={isClientProposing}
				clientEmail={form.clientEmail}
				magicLinkStatus={magicLinkStatus}
				onCreateAnother={() => {
					window.location.reload();
				}}
			/>
		);
	}

	if (solanaTxStatus === "success" && solanaSubmission !== null) {
		return (
			<CreateSuccessView
				txHash={solanaSubmission.signature}
				explorerUrl={solanaSubmission.explorerUrl}
				networkLabel="Solana Devnet"
				isClientProposing={isClientProposing}
				clientEmail={form.clientEmail}
				magicLinkStatus={magicLinkStatus}
				onCreateAnother={() => {
					window.location.reload();
				}}
			/>
		);
	}

	return (
		<div className="tl-app-shell tl-app-shell--wide">
			<CreatePageHeader isClientProposing={isClientProposing} paymentToken={paymentToken} />
			<CreatePageControls page={page} />
			<CreatePageWorkspace page={page} />
		</div>
	);
}
