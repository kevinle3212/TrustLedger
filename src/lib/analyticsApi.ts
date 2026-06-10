import { isAddress } from "viem";

export interface WalletAnalyticsMetadata {
	readonly address: `0x${string}`;
	readonly privacyBoundary: readonly string[];
	readonly publicSignals: readonly string[];
	readonly localSignals: readonly string[];
	readonly fingerprint: string;
}

function fingerprintAddress(address: string): string {
	let hash = 2166136261;
	for (const character of address.toLowerCase()) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildWalletAnalyticsMetadata(address: string): WalletAnalyticsMetadata | null {
	if (!isAddress(address)) return null;
	return {
		address,
		privacyBoundary: [
			"No private keys",
			"No seed phrases",
			"No emails",
			"No raw documents",
			"No encrypted draft bodies",
		],
		publicSignals: [
			"TrustLedger contract status counts",
			"Public reputation registry score",
			"Connected chain deployment metadata",
		],
		localSignals: ["Last connector label", "Dashboard guide state", "Selected locale"],
		fingerprint: fingerprintAddress(address),
	};
}
