// scripts/sync-frontend-env.ts - sync deployed contract addresses into the
// frontend's local env file so the Next.js dev server picks them up.
//
// The frontend reads contract addresses from NEXT_PUBLIC_* env vars (see
// src/lib/wagmi.ts). In production the deploy workflow upserts these into Vercel;
// for local development this script bridges artifacts/deployed-addresses.json
// (written by scripts/deploy.ts) into src/.env.local. Without it the reputation
// page shows "ReputationRegistry is not configured" after a fresh local deploy.
//
// Run directly:    npx hardhat run scripts/sync-frontend-env.ts  (or via tsx/ts-node)
// Run from deploy: imported and called by scripts/deploy.ts for local networks.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

/**
 * Reads a UTF-8 file, returning `null` if it does not exist. Uses a try/catch on
 * the read itself (rather than a separate existsSync check) to avoid a
 * time-of-check-to-time-of-use race between the existence check and the read.
 */
function readFileOrNull(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw err;
	}
}

/** Maps the deployed-addresses.json keys to their NEXT_PUBLIC_* env var names. */
const ENV_KEY_BY_CONTRACT: Record<string, string> = {
	TrustLedger: "NEXT_PUBLIC_TRUSTLEDGER_ADDRESS",
	Arbitration: "NEXT_PUBLIC_ARBITRATION_ADDRESS",
	JurorRegistry: "NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS",
	ReputationRegistry: "NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS",
	TrustLedgerDeployBlock: "NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK",
};

/** Upserts `key=value` into the `.env` file body, preserving all other lines. */
function upsertEnvLine(body: string, key: string, value: string): string {
	const line = `${key}=${value}`;
	const prefix = `${key}=`;
	const lines = body.split("\n");
	const idx = lines.findIndex((l): boolean => l === line || l.startsWith(prefix));
	if (idx !== -1) {
		lines[idx] = line;
		return lines.join("\n");
	}
	const trimmed = body.replace(/\s*$/, "");
	return trimmed === "" ? `${line}\n` : `${trimmed}\n${line}\n`;
}

/**
 * Reads artifacts/deployed-addresses.json and writes the four NEXT_PUBLIC_*
 * contract-address keys into src/.env.local, leaving every other line intact.
 * Idempotent: re-running overwrites only the managed keys.
 */
export function syncFrontendEnv(): void {
	const addressesPath = resolve(__dirname, "../artifacts/deployed-addresses.json");
	const addressesJson = readFileOrNull(addressesPath);
	if (addressesJson === null) {
		console.warn(
			"sync-frontend-env: artifacts/deployed-addresses.json not found - run a deploy first.",
		);
		return;
	}

	const addresses = JSON.parse(addressesJson) as Record<string, string>;
	const envPath = resolve(__dirname, "../src/.env.local");
	let body = readFileOrNull(envPath) ?? "";

	for (const [contract, envKey] of Object.entries(ENV_KEY_BY_CONTRACT)) {
		const value = addresses[contract];
		if (typeof value === "string" && value !== "") {
			body = upsertEnvLine(body, envKey, value);
		}
	}

	writeFileSync(envPath, body);
	console.log("sync-frontend-env: updated src/.env.local with deployed contract addresses.");
}

// Allow running standalone: `npx hardhat run scripts/sync-frontend-env.ts`.
if (process.argv[1] === __filename) {
	syncFrontendEnv();
}
