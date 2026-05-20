import { keccak256, toBytes } from "viem";

// Convenience wrapper for keccak256(toBytes(value)). Currently unused - call sites
// inline the keccak256 call directly - but kept as a potentially useful helper for
// future hashing needs (e.g. contract/proof URIs) to keep those call sites terse.
export function hashString(value: string): `0x${string}` {
	return keccak256(toBytes(value));
}

export function daysToSeconds(days: number): bigint {
	return BigInt(Math.floor(days * 24 * 60 * 60));
}

// Bare IPFS CIDs: v0 (Qm…, 46 chars) or v1 (b…, base32). Loose check - enough to
// distinguish a pasted CID from an http URL or arbitrary text.
const BARE_CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{20,})$/;

// Resolve an on-chain document URI to a browser-openable gateway URL.
// Handles ipfs:// and ar:// schemes, bare IPFS CIDs, and passes http(s) URLs
// through unchanged. Returns undefined when the value cannot resolve to a real
// link (empty, the "ipfs://" placeholder, or arbitrary non-URL text) so callers
// can hide the link instead of rendering a broken one.
//
// Example: resolveDocUrl("ipfs://QmHash") -> "https://ipfs.io/ipfs/QmHash"
export function resolveDocUrl(uri: string): string | undefined {
	const trimmed = uri.trim();
	if (trimmed === "" || trimmed === "ipfs://" || trimmed === "ar://") return undefined;
	if (trimmed.startsWith("ipfs://")) {
		return `https://ipfs.io/ipfs/${trimmed.slice("ipfs://".length)}`;
	}
	if (trimmed.startsWith("ar://")) {
		return `https://arweave.net/${trimmed.slice("ar://".length)}`;
	}
	if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
	if (BARE_CID.test(trimmed)) return `https://ipfs.io/ipfs/${trimmed}`;
	return undefined;
}

export function formatAddress(addr: string): string {
	return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatEth(wei: bigint): string {
	const eth = Number(wei) / 1e18;
	return `${eth.toLocaleString(undefined, { maximumFractionDigits: 6 })} ETH`;
}

export function formatDeadline(ts: bigint): string {
	if (ts === BigInt(0)) return "-";
	return new Date(Number(ts) * 1000).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
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
