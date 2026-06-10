#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const FORBIDDEN_PATHS = [
	/^\.env(?:\..*)?$/u,
	/(^|\/)target\/deploy\/.*\.json$/u,
	/(^|\/).*keypair.*\.json$/iu,
	/(^|\/).*-keypair\.json$/iu,
	/(^|\/).*secret.*\.json$/iu,
	/(^|\/).*private.*key.*$/iu,
	/(^|\/)k8s\/.*secret.*\.ya?ml$/iu,
];
const ALLOWED_PATHS = new Set([".env.example", ".env.local.example", "k8s/secret.example.yaml"]);
const IGNORED_PREFIXES = ["contracts/lib/"];
const SENSITIVE_CONTENT = [
	{ name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/u },
	{
		name: "solana keypair array",
		pattern: /^\s*\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]\s*$/u,
	},
];

function gitFiles(args) {
	return execFileSync("git", args, { encoding: "utf8" })
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

function candidateFiles() {
	const files = new Set(gitFiles(["ls-files"]));
	for (const file of gitFiles(["diff", "--cached", "--name-only", "--diff-filter=ACMR"])) {
		files.add(file);
	}
	return [...files].sort();
}

function isForbiddenPath(file) {
	return !ALLOWED_PATHS.has(file) && FORBIDDEN_PATHS.some((pattern) => pattern.test(file));
}

function shouldIgnoreContent(file) {
	return IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function readSmallText(file) {
	if (!existsSync(file)) return "";
	try {
		const content = readFileSync(file);
		if (content.byteLength > 1024 * 1024) return "";
		return content.toString("utf8");
	} catch {
		return "";
	}
}

function hasUnredactedDotenvSecret(text) {
	for (const line of text.split("\n")) {
		const match = /^([A-Z0-9_]*(?:SECRET|PRIVATE_KEY|API_KEY|TOKEN))=(.+)$/u.exec(line.trim());
		if (match === null) continue;
		const value = match[2]?.trim().replace(/^['"]|['"]$/gu, "") ?? "";
		if (
			value === "" ||
			value.includes("$") ||
			value.includes("...") ||
			/^(?:<.*>|your[-_ ]?|replace|example|changeme|dummy|test|redacted)/iu.test(value)
		) {
			continue;
		}
		return true;
	}
	return false;
}

const findings = [];
for (const file of candidateFiles()) {
	if (isForbiddenPath(file)) {
		findings.push(`${file}: forbidden sensitive path`);
		continue;
	}
	if (shouldIgnoreContent(file)) continue;
	const text = readSmallText(file);
	if (text === "") continue;
	for (const { name, pattern } of SENSITIVE_CONTENT) {
		if (pattern.test(text)) {
			findings.push(`${file}: possible ${name}`);
			break;
		}
	}
	if (hasUnredactedDotenvSecret(text)) {
		findings.push(`${file}: possible unredacted dotenv secret`);
	}
}

if (findings.length > 0) {
	console.error("Sensitive file guard failed:");
	for (const finding of findings) {
		console.error(`- ${finding}`);
	}
	console.error(
		"Move secrets to ignored local files or Vercel/GitHub secrets. Do not bypass this check.",
	);
	process.exit(1);
}

console.log("Sensitive file guard passed.");
