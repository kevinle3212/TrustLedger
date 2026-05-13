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
  return eth.toLocaleString(undefined, { maximumFractionDigits: 6 }) + " ETH";
}

export function formatDeadline(ts: bigint): string {
  if (ts === BigInt(0)) return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const STATUS_COLORS: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-800",   // PENDING
  1: "bg-blue-100 text-blue-800",       // ACTIVE
  2: "bg-purple-100 text-purple-800",   // SUBMITTED
  3: "bg-green-100 text-green-800",     // APPROVED
  4: "bg-red-100 text-red-800",         // DISPUTED
  5: "bg-gray-100 text-gray-800",       // RESOLVED
  6: "bg-gray-100 text-gray-500",       // CANCELLED
};
