"use client";

import type { FormFields, PaymentToken } from "../_lib/types";
import { AdvancedOptionsSection } from "./AdvancedOptionsSection";
import { PartiesPaymentSection } from "./PartiesPaymentSection";
import { TimelineSection } from "./TimelineSection";

interface Props {
	form: FormFields;
	set: (key: keyof FormFields, value: string) => void;
	showError: (key: string) => string | undefined;
	markTouched: (key: string) => void;
	isClientProposing: boolean;
	paymentToken: PaymentToken;
}

/** Composes the core contract-form cards after collaborative drafting and document upload. */
export function ContractFormFields({
	form,
	set,
	showError,
	markTouched,
	isClientProposing,
	paymentToken,
}: Props): React.JSX.Element {
	return (
		<>
			<PartiesPaymentSection
				form={form}
				set={set}
				showError={showError}
				markTouched={markTouched}
				isClientProposing={isClientProposing}
				paymentToken={paymentToken}
			/>
			<TimelineSection
				form={form}
				set={set}
				showError={showError}
				markTouched={markTouched}
			/>
			<AdvancedOptionsSection
				form={form}
				set={set}
				showError={showError}
				markTouched={markTouched}
			/>
		</>
	);
}
