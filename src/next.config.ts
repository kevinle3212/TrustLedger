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

// Resolve a deployed contract address. Priority: env var > artifacts JSON > zero address.
function resolveAddress(jsonKey: string, envKey: string): string {
	const envAddr = process.env[envKey];
	if (envAddr !== undefined && envAddr !== ZERO) return envAddr;

	try {
		const json = JSON.parse(
			fs.readFileSync(
				path.resolve(__dirname, "../artifacts/deployed-addresses.json"),
				"utf8",
			),
		) as Record<string, string | undefined>;
		return json[jsonKey] ?? ZERO;
	} catch {
		return ZERO;
	}
}

const rootEnv = parseRootEnv();

const nextConfig: NextConfig = {
	// Controls the URL prefix. Read from process.env first (set via Vercel project settings),
	// then falls back to the root .env (parsed above), then to empty string (served at root).
	basePath: process.env["NEXT_BASE_PATH"] ?? rootEnv["NEXT_BASE_PATH"] ?? "",
	// Must point to the repo root so Next.js traces node_modules relative to
	// /vercel/path0/ rather than /vercel/path0/src/, matching where Vercel resolves them.
	outputFileTracingRoot: path.resolve(__dirname, ".."),
	env: {
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS: resolveAddress(
			"TrustLedger",
			"NEXT_PUBLIC_TRUSTLEDGER_ADDRESS",
		),
		NEXT_PUBLIC_ARBITRATION_ADDRESS: resolveAddress(
			"Arbitration",
			"NEXT_PUBLIC_ARBITRATION_ADDRESS",
		),
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS: resolveAddress(
			"JurorRegistry",
			"NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS",
		),
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS: resolveAddress(
			"ReputationRegistry",
			"NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS",
		),
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
			process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ??
			rootEnv["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ??
			"",
		// Resolution order:
		//   1. Vercel system vars - injected by Vercel's build infrastructure when a
		//      Git integration push triggers the deploy, or when the CI workflow
		//      explicitly sets them (see frontend-deploy.yml).
		//   2. NEXT_PUBLIC_GITHUB_URL - set in Vercel project settings or root .env;
		//      covers `vercel --prod` CLI deploys where git system vars are absent.
		//   3. Empty string - icon is hidden rather than broken.
		NEXT_PUBLIC_GITHUB_URL:
			process.env["VERCEL_GIT_REPO_OWNER"] && process.env["VERCEL_GIT_REPO_SLUG"]
				? `https://github.com/${process.env["VERCEL_GIT_REPO_OWNER"]}/${process.env["VERCEL_GIT_REPO_SLUG"]}`
				: (process.env["NEXT_PUBLIC_GITHUB_URL"] ??
					rootEnv["NEXT_PUBLIC_GITHUB_URL"] ??
					""),
	},
};

export default nextConfig;
