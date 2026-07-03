#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const VERCEL_CWD = path.join(ROOT, "src");
const ENVIRONMENT = process.argv.includes("--preview") ? "preview" : "production";

const VERCEL_KEYS = [
	"ADMIN_API_TOKEN",
	"ADMIN_SESSION_SECRET",
	"ADMIN_ALLOWED_IPS",
	"ADMIN_WALLET_ADDRESSES",
	"ADMIN_BOOTSTRAP_EMAIL",
	"ADMIN_BOOTSTRAP_USERNAME",
	"ADMIN_BOOTSTRAP_PASSWORD_HASH",
	"ADMIN_BOOTSTRAP_WALLET_ADDRESS",
	"ADMIN_ACCOUNTS_JSON",
	"ACCOUNT_SESSION_SECRET",
	"AI_SUMMARY_PROVIDER",
	"AUTH_JWT_SECRET",
	"CRON_SECRET",
	"GEMINI_API_KEY",
	"GEMINI_MODEL",
	"GOOGLE_GENERATIVE_AI_API_KEY",
	"GROQ_API_KEY",
	"GROQ_MODEL",
	"HEALTH_CHECK_TOKEN",
	"HEALTH_CHECK_ALLOWED_IPS",
	"MAGIC_LINK_SECRET",
	"NEXT_PUBLIC_APP_URL",
	"NEXT_PUBLIC_GITHUB_URL",
	"NEXT_PUBLIC_SITE_URL",
	"NEXT_PUBLIC_SOLANA_CLUSTER",
	"NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
	"NOTIFICATION_EMAILS",
	"NOTIFICATIONS_SECRET",
	"ORACLE_PRICE_SOURCE_URL",
	"ORACLE_RATE_TTL_MS",
	"RESEND_API_KEY",
	"RESEND_FROM",
	"SEPOLIA_RPC_URL",
	"TRUSTLEDGER_ADMIN_API_BIND",
	"TRUSTLEDGER_ADMIN_API_TOKEN",
	"TRUSTLEDGER_ENV",
];

function readEnv(file) {
	const values = new Map();
	let body;
	try {
		body = fs.readFileSync(path.join(ROOT, file), "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return values;
		throw error;
	}
	for (const line of body.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (!match) continue;
		const raw = match[2].trim();
		const unquoted =
			(raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
				? raw.slice(1, -1)
				: raw;
		values.set(match[1], unquoted);
	}
	return values;
}

function mergeEnvFiles(files) {
	const merged = new Map();
	for (const file of files) {
		for (const [key, value] of readEnv(file)) {
			if (value !== "") merged.set(key, value);
		}
	}
	return merged;
}

function run(args, input) {
	const command = process.env["VERCEL_BIN"] ?? "vercel";
	let result = spawnSync(command, args, {
		cwd: VERCEL_CWD,
		encoding: "utf8",
		input,
		stdio: input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
	});
	if (result.error?.code === "ENOENT") {
		result = spawnSync("npx", ["--yes", "vercel", ...args], {
			cwd: VERCEL_CWD,
			encoding: "utf8",
			input,
			stdio: input === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
		});
	}
	if (result.status !== 0) {
		throw new Error(result.stderr || result.stdout || `vercel ${args.join(" ")} failed`);
	}
	return result.stdout;
}

function parseVercelNames(stdout) {
	const parsed = JSON.parse(stdout);
	const envs = Array.isArray(parsed) ? parsed : parsed.envs;
	if (!Array.isArray(envs)) return new Set();
	return new Set(
		envs.flatMap((entry) =>
			typeof entry === "object" && entry !== null && typeof entry.key === "string"
				? [entry.key]
				: [],
		),
	);
}

const localValues = mergeEnvFiles([".env", ".env.local", "src/.env.local"]);
const existingNames = parseVercelNames(
	run(["env", "ls", ENVIRONMENT, "--format", "json", "--no-color"]),
);

let added = 0;
let skippedBlank = 0;
for (const key of VERCEL_KEYS) {
	if (existingNames.has(key)) continue;
	const value = localValues.get(key);
	if (value === undefined || value === "") {
		skippedBlank += 1;
		continue;
	}
	run(["env", "add", key, ENVIRONMENT, "--value", value, "--yes", "--no-color"]);
	added += 1;
}

console.log(
	`vercel env ${ENVIRONMENT}: added ${added} missing key(s), skipped ${skippedBlank} blank key(s)`,
);
