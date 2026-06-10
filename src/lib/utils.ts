export function daysToSeconds(days: number): bigint {
	return BigInt(Math.floor(days * 24 * 60 * 60));
}

// Bare IPFS CIDs: v0 (Qm…, 46 chars) or v1 (b…, base32). Loose check - enough to
// distinguish a pasted CID from an http URL or arbitrary text.
const BARE_CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{20,})$/;

// Public IPFS gateway used for document links. Pinata's gateway serves pinned
// content directly (HTTP 200, no redirect), unlike ipfs.io which now bounces
// CIDv1 requests through a service-worker gateway (inbrowser.link). Uploads go
// through Pinata (see lib/ipfs.ts), so this gateway already hosts the content.
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

// Resolve an on-chain document URI to a browser-openable gateway URL.
// Handles ipfs:// and ar:// schemes, bare IPFS CIDs, and passes http(s) URLs
// through unchanged. Returns undefined when the value cannot resolve to a real
// link (empty, the "ipfs://" placeholder, or arbitrary non-URL text) so callers
// can hide the link instead of rendering a broken one.
//
// Example: resolveDocUrl("ipfs://QmHash") -> "https://gateway.pinata.cloud/ipfs/QmHash"
export function resolveDocUrl(uri: string): string | undefined {
	const trimmed = uri.trim();
	if (trimmed === "" || trimmed === "ipfs://" || trimmed === "ar://") return undefined;
	if (trimmed.startsWith("ipfs://")) {
		return `${IPFS_GATEWAY}${trimmed.slice("ipfs://".length)}`;
	}
	if (trimmed.startsWith("ar://")) {
		return `https://arweave.net/${trimmed.slice("ar://".length)}`;
	}
	if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
	if (BARE_CID.test(trimmed)) return `${IPFS_GATEWAY}${trimmed}`;
	return undefined;
}

export function formatAddress(addr: string): string {
	return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatEth(wei: bigint, locale?: string): string {
	const eth = Number(wei) / 1e18;
	return `${eth.toLocaleString(locale, { maximumFractionDigits: 6 })} ETH`;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Formats an escrow amount using the correct unit for the payment token.
 * Native ETH (zero address) → 18-decimal ETH formatting.
 * Any ERC-20 (e.g. USDC) → 6-decimal USDC formatting.
 * The 6-decimal assumption is safe for USDC on all supported chains.
 */
export function formatTokenAmount(amount: bigint, tokenAddress: string, locale?: string): string {
	if (tokenAddress === ZERO_ADDRESS) {
		return formatEth(amount, locale);
	}
	const usdc = Number(amount) / 1e6;
	return `${usdc.toLocaleString(locale, { maximumFractionDigits: 2 })} USDC`;
}

/** Returns "ETH" or "USDC" for display in labels/hints. */

export function formatDeadline(ts: bigint, _locale?: string): string {
	if (ts === BigInt(0)) return "-";
	return formatDateMMDDYYYY(new Date(Number(ts) * 1000));
}

function formatDateMMDDYYYY(date: Date): string {
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	const year = String(date.getUTCFullYear());
	return `${month}/${day}/${year}`;
}

function formatFutureDateFromDays(days: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + Math.max(0, Math.round(days)));
	return formatDateMMDDYYYY(date);
}

export function formatDeadlineWithRelativeDays(days: number, relativeLabel: string): string {
	return `${relativeLabel} (${formatFutureDateFromDays(days)})`;
}

export const STATUS_COLORS: Record<number, string> = {
	0: "bg-yellow-500/20 text-yellow-300", // PENDING
	1: "bg-blue-500/20 text-blue-300", // ACTIVE
	2: "bg-purple-500/20 text-purple-300", // SUBMITTED
	3: "bg-green-500/20 text-green-300", // APPROVED
	4: "bg-red-500/20 text-red-300", // DISPUTED
	5: "bg-gray-500/20 text-gray-300", // RESOLVED
	6: "bg-gray-500/10 text-gray-500", // CANCELLED
};
