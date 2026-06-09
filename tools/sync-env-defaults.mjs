#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const TARGETS = [
	{
		examples: [".env.example"],
		target: ".env",
		include: () => true,
	},
	{
		examples: [".env.local.example", ".env.example"],
		target: ".env.local",
		include: (key) => key.startsWith("NEXT_PUBLIC_") || ROOT_LOCAL_KEYS.has(key),
	},
	{
		examples: ["src/.env.local.example", ".env.example"],
		target: "src/.env.local",
		include: (key) => key.startsWith("NEXT_PUBLIC_") || SRC_LOCAL_KEYS.has(key),
	},
];

const ROOT_LOCAL_KEYS = new Set([
	"NEXT_BASE_PATH",
	"ADMIN_ALLOWED_IPS",
	"ADMIN_BOOTSTRAP_EMAIL",
	"ADMIN_BOOTSTRAP_USERNAME",
	"ADMIN_WALLET_ADDRESSES",
	"HEALTH_CHECK_ALLOWED_IPS",
]);

const SRC_LOCAL_KEYS = new Set(["NEXT_BASE_PATH"]);

const LOCAL_SECRET_KEYS = new Set([
	"ADMIN_API_TOKEN",
	"ADMIN_SESSION_SECRET",
	"CRON_SECRET",
	"HEALTH_CHECK_TOKEN",
	"MAGIC_LINK_SECRET",
	"NOTIFICATIONS_SECRET",
	"TRUSTLEDGER_ADMIN_API_TOKEN",
]);

const DEFAULT_VALUES = new Map([
	["ADMIN_BOOTSTRAP_EMAIL", "kevinle3212@gmail.com"],
	["ADMIN_BOOTSTRAP_USERNAME", "kevinle"],
	["NEXT_PUBLIC_APP_URL", "https://trustledger-zeta.vercel.app"],
	["NEXT_PUBLIC_SITE_URL", "https://trustledger-zeta.vercel.app"],
	["NEXT_PUBLIC_SOLANA_CLUSTER", "devnet"],
	["NEXT_PUBLIC_GITHUB_URL", "https://github.com/kevinle3212/TrustLedger"],
	["TRUSTLEDGER_ADMIN_API_BIND", "127.0.0.1:4100"],
	["TRUSTLEDGER_ENV", "local"],
]);

function readFileOrEmpty(file) {
	try {
		return fs.readFileSync(path.join(ROOT, file), "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return "";
		throw error;
	}
}

function parseEnvKeys(body) {
	const keys = [];
	for (const line of body.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);
		if (match) keys.push(match[1]);
	}
	return keys;
}

function parseEnvMap(body) {
	const values = new Map();
	for (const line of body.split(/\r?\n/)) {
		const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
		if (match) values.set(match[1], match[2]);
	}
	return values;
}

function generatedValueFor(key, existingValues) {
	if (existingValues.has(key) && existingValues.get(key) !== "") return existingValues.get(key);
	if (DEFAULT_VALUES.has(key)) return DEFAULT_VALUES.get(key);
	if (LOCAL_SECRET_KEYS.has(key)) return crypto.randomBytes(32).toString("hex");
	return "";
}

function syncTarget(target) {
	const exampleKeys = [
		...new Set(
			target.examples.flatMap((example) =>
				parseEnvKeys(readFileOrEmpty(example)).filter(target.include),
			),
		),
	];
	const body = readFileOrEmpty(target.target);
	const existing = parseEnvMap(body);
	const missing = exampleKeys.filter((key) => !existing.has(key));
	if (missing.length === 0) {
		return { target: target.target, added: [] };
	}

	const lines = [
		body.replace(/\s*$/, ""),
		"",
		"# Added by tools/sync-env-defaults.mjs. Existing values are never overwritten.",
		...missing.map((key) => `${key}=${generatedValueFor(key, existing)}`),
		"",
	];
	fs.mkdirSync(path.dirname(path.join(ROOT, target.target)), { recursive: true });
	fs.writeFileSync(path.join(ROOT, target.target), lines.join("\n"));
	return { target: target.target, added: missing };
}

const results = TARGETS.map(syncTarget);
for (const result of results) {
	console.log(`${result.target}: added ${result.added.length} missing key(s)`);
}
