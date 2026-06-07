"use client";

import { Field } from "@/components/Field";
import { Input } from "@/components/Input";

interface Props {
	enabled: boolean;
	onEnabledChange: (enabled: boolean) => void;
	passphrase: string;
	onPassphraseChange: (value: string) => void;
	onPassphraseBlur: () => void;
	passphraseError: string | undefined;
}

/** Encrypt-before-upload toggle and passphrase field. */
export function EncryptionOptions({
	enabled,
	onEnabledChange,
	passphrase,
	onPassphraseChange,
	onPassphraseBlur,
	passphraseError,
}: Props): React.JSX.Element {
	return (
		<>
			<label className="flex items-center gap-3 cursor-pointer select-none">
				<input
					type="checkbox"
					checked={enabled}
					onChange={(e) => {
						onEnabledChange(e.target.checked);
					}}
					className="w-4 h-4 rounded border-gray-300 dark:border-white/20 bg-gray-100 dark:bg-white/5 text-indigo-500 focus:ring-indigo-500"
				/>
				<span className="text-sm text-gray-600 dark:text-gray-300">
					Encrypt before upload (AES-256-GCM)
				</span>
			</label>

			{enabled && (
				<Field
					label="Passphrase"
					hint="Share this with the other party via a separate secure channel. You cannot decrypt without it."
					error={passphraseError}
				>
					<Input
						type="password"
						placeholder="Strong passphrase…"
						value={passphrase}
						onChange={(e) => {
							onPassphraseChange(e.target.value);
						}}
						onBlur={onPassphraseBlur}
						error={passphraseError !== undefined}
					/>
				</Field>
			)}
		</>
	);
}
