import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const ZERO = "0x0000000000000000000000000000000000000000";
const ROOT_ENV = path.resolve(__dirname, "../.env");

// Parse key=value pairs from the root .env so next.config.ts can inject
// variables that Next.js wouldn't find (it only loads .env files from src/).
function parseRootEnv(): Record<string, string> {
	try {
		return Object.fromEntries(
			fs
				.readFileSync(ROOT_ENV, "utf8")
				.split("\n")
				.flatMap((line) => {
					const trimmed = line.trim();
					if (trimmed === "" || trimmed.startsWith("#")) return [];
					const eq = trimmed.indexOf("=");
					if (eq === -1) return [];
					return [[trimmed.slice(0, eq), trimmed.slice(eq + 1)]];
				}),
		);
	} catch {
		return {};
	}
}

// Resolve the deployed TrustLedger address without requiring manual .env edits.
// Priority: explicit non-zero env var > artifacts/deployed-addresses.json > zero address.
// The address is a public Sepolia contract address - not a secret.
function resolveTrustLedgerAddress(): string {
	const envAddr = process.env["NEXT_PUBLIC_TRUSTLEDGER_ADDRESS"];
	if (envAddr !== undefined && envAddr !== ZERO) return envAddr;

	try {
		const json = JSON.parse(
			fs.readFileSync(
				path.resolve(__dirname, "../artifacts/deployed-addresses.json"),
				"utf8",
			),
		) as Record<string, string | undefined>;
		return json["TrustLedger"] ?? ZERO;
	} catch {
		return ZERO;
	}
}

const rootEnv = parseRootEnv();

const nextConfig: NextConfig = {
	// Controls the URL prefix. Read from process.env first (set via Vercel project settings),
	// then falls back to the root .env (parsed above), then to empty string (served at root).
	basePath: process.env["NEXT_BASE_PATH"] ?? rootEnv["NEXT_BASE_PATH"] ?? "",
	turbopack: {
		// Pin the workspace root to the frontend directory so Next.js doesn't
		// pick up the parent repo's package-lock.json as the workspace root.
		root: path.resolve(__dirname),
	},
	env: {
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS: resolveTrustLedgerAddress(),
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
			process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ??
			rootEnv["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ??
			"",
	},
};

export default nextConfig;
