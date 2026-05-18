import { keccak256, toBytes } from "viem";

export function hashString(value: string): `0x${string}` {
	return keccak256(toBytes(value));
}

export function daysToSeconds(days: number): bigint {
	return BigInt(Math.floor(days * 24 * 60 * 60));
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
