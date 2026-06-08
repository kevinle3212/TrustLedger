import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
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

function isContractAddress(value: string | undefined): value is `0x${string}` {
	return /^0x[a-fA-F0-9]{40}$/.test(value ?? "") && value !== ZERO;
}

// Resolve a deployed contract address. Priority: env var > root .env > artifacts JSON > zero address.
function resolveAddress(jsonKey: string, envKey: string): string {
	const envAddr = process.env[envKey];
	if (isContractAddress(envAddr)) return envAddr;

	const rootAddr = rootEnv[envKey];
	if (isContractAddress(rootAddr)) return rootAddr;

	try {
		const json = JSON.parse(
			fs.readFileSync(
				path.resolve(__dirname, "../artifacts/deployed-addresses.json"),
				"utf8",
			),
		) as Record<string, string | undefined>;
		const artifactAddr = json[jsonKey];
		return isContractAddress(artifactAddr) ? artifactAddr : ZERO;
	} catch {
		return ZERO;
	}
}

function resolveArtifactValue(jsonKey: string, envKey: string): string {
	const envValue = process.env[envKey];
	if (envValue !== undefined && envValue !== "") return envValue;

	try {
		const json = JSON.parse(
			fs.readFileSync(
				path.resolve(__dirname, "../artifacts/deployed-addresses.json"),
				"utf8",
			),
		) as Record<string, string | number | undefined>;
		const artifactValue = json[jsonKey];
		return artifactValue === undefined ? "" : String(artifactValue);
	} catch {
		return "";
	}
}

function resolveEnvValue(envKey: string): string {
	return process.env[envKey] ?? rootEnv[envKey] ?? "";
}

const rootEnv = parseRootEnv();

// Resolve the public GitHub URL. Priority:
//   1. Vercel system vars (VERCEL_GIT_REPO_OWNER / VERCEL_GIT_REPO_SLUG) - injected
//      automatically by Vercel's build infrastructure on Git-integration deploys.
//   2. NEXT_PUBLIC_GITHUB_URL - set in Vercel project settings or root .env;
//      covers `vercel --prod` CLI deploys where the git system vars are absent.
//   3. Empty string - icon is hidden rather than broken.
function resolveGithubUrl(): string {
	const owner = process.env["VERCEL_GIT_REPO_OWNER"];
	const slug = process.env["VERCEL_GIT_REPO_SLUG"];
	if (owner !== undefined && owner !== "" && slug !== undefined && slug !== "") {
		return `https://github.com/${owner}/${slug}`;
	}
	return process.env["NEXT_PUBLIC_GITHUB_URL"] ?? rootEnv["NEXT_PUBLIC_GITHUB_URL"] ?? "";
}

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
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK: resolveArtifactValue(
			"TrustLedgerDeployBlock",
			"NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK",
		),
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_SEPOLIA",
		),
		NEXT_PUBLIC_ARBITRATION_ADDRESS_SEPOLIA: resolveEnvValue(
			"NEXT_PUBLIC_ARBITRATION_ADDRESS_SEPOLIA",
		),
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_SEPOLIA: resolveEnvValue(
			"NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_SEPOLIA",
		),
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_SEPOLIA: resolveEnvValue(
			"NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_SEPOLIA",
		),
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_SEPOLIA: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_SEPOLIA",
		),
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_ARBITRUM: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_ARBITRUM",
		),
		NEXT_PUBLIC_ARBITRATION_ADDRESS_ARBITRUM: resolveEnvValue(
			"NEXT_PUBLIC_ARBITRATION_ADDRESS_ARBITRUM",
		),
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_ARBITRUM: resolveEnvValue(
			"NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_ARBITRUM",
		),
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_ARBITRUM: resolveEnvValue(
			"NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_ARBITRUM",
		),
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_ARBITRUM: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_ARBITRUM",
		),
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_BASE: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_BASE",
		),
		NEXT_PUBLIC_ARBITRATION_ADDRESS_BASE: resolveEnvValue(
			"NEXT_PUBLIC_ARBITRATION_ADDRESS_BASE",
		),
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_BASE: resolveEnvValue(
			"NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_BASE",
		),
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_BASE: resolveEnvValue(
			"NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_BASE",
		),
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_BASE: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_BASE",
		),
		NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_OPTIMISM: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_ADDRESS_OPTIMISM",
		),
		NEXT_PUBLIC_ARBITRATION_ADDRESS_OPTIMISM: resolveEnvValue(
			"NEXT_PUBLIC_ARBITRATION_ADDRESS_OPTIMISM",
		),
		NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_OPTIMISM: resolveEnvValue(
			"NEXT_PUBLIC_JUROR_REGISTRY_ADDRESS_OPTIMISM",
		),
		NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_OPTIMISM: resolveEnvValue(
			"NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS_OPTIMISM",
		),
		NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_OPTIMISM: resolveEnvValue(
			"NEXT_PUBLIC_TRUSTLEDGER_DEPLOY_BLOCK_OPTIMISM",
		),
		NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
			process.env["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ??
			rootEnv["NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"] ??
			"",
		NEXT_PUBLIC_GITHUB_URL: resolveGithubUrl(),
	},
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
