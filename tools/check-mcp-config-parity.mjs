#!/usr/bin/env node
/**
 * MCP-config parity check.
 *
 * Closes the follow-up from
 * `audits/infrastructure/20260701-035427-ai-tooling-configuration-audit.md`:
 * the per-assistant MCP configs had drifted (an invalid Serena `--context` that
 * stopped Serena from starting, and Nexus entries that bypassed the tuned
 * project wrapper). This asserts every committed assistant config stays
 * consistent so the same class of drift cannot recur silently.
 *
 * For each config it verifies:
 *   - Serena starts with a real Serena `--context` value and `NO_COLOR=1`.
 *   - Nexus runs the canonical wrapper (`scripts/nexus-mcp.js`), never the raw
 *     `nexus-graph` binary, with the tuned timeout/tree-sitter env.
 *
 * Exit code 0 = all configs consistent; 1 = drift found (details printed).
 */
import { readFileSync } from "node:fs";
import { parse as parseToml } from "smol-toml";

// Valid Serena contexts. Source: the AI-tooling-configuration audit, which
// enumerated the accepted values (`serena` exits with
// `FileNotFoundError: Context <x> not found` for anything else). Update this
// list only alongside a Serena upgrade that adds or renames a context.
const VALID_SERENA_CONTEXTS = new Set(["ide", "agent", "claude-code", "codex", "copilot-cli"]);

// The tuned Nexus env every assistant must share so all of them start the same
// timeout-bounded, byte-capped graph server as `.mcp.json` and `npm run nexus:server`.
const REQUIRED_NEXUS_ENV = {
	NODE_ENV: "development",
	NO_COLOR: "1",
	NEXUS_MCP_TIMEOUT_MS: "120000",
	NEXUS_MAX_TREE_SITTER_TS_BYTES: "25000",
};

// Each config plus the accessor that yields its `{ name: { command, args, env } }` server map.
const CONFIGS = [
	{ path: ".mcp.json", read: readJsonServers },
	{ path: ".cursor/mcp.json", read: readJsonServers },
	{ path: ".copilot/mcp-config.json", read: readJsonServers },
	{ path: ".gemini/settings.json", read: readJsonServers },
	{ path: ".codex/config.toml", read: readTomlServers },
];

function readJsonServers(text) {
	return JSON.parse(text).mcpServers ?? {};
}

function readTomlServers(text) {
	return parseToml(text).mcp_servers ?? {};
}

function contextValue(args) {
	const flag = (args ?? []).find((a) => typeof a === "string" && a.startsWith("--context="));
	return flag ? flag.slice("--context=".length) : undefined;
}

function checkSerena(server, errors) {
	if (!server) {
		errors.push("missing `serena` server entry");
		return;
	}
	if (server.command !== "serena") {
		errors.push(`serena command is \`${server.command}\`, expected \`serena\``);
	}
	if (!(server.args ?? []).includes("start-mcp-server")) {
		errors.push("serena args missing `start-mcp-server`");
	}
	const ctx = contextValue(server.args);
	if (!ctx) {
		errors.push("serena args missing a `--context=<value>` flag");
	} else if (!VALID_SERENA_CONTEXTS.has(ctx)) {
		errors.push(
			`serena --context=${ctx} is not a valid Serena context (allowed: ${[...VALID_SERENA_CONTEXTS].join(", ")})`,
		);
	}
	if (server.env?.NO_COLOR !== "1") {
		errors.push("serena env is missing `NO_COLOR=1`");
	}
}

function checkNexus(server, errors) {
	if (!server) {
		errors.push("missing `nexus` server entry");
		return;
	}
	if (server.command !== "node") {
		errors.push(
			`nexus command is \`${server.command}\`, expected \`node\` (use the project wrapper)`,
		);
	}
	const args = server.args ?? [];
	if (args.some((a) => typeof a === "string" && a.includes("nexus-graph"))) {
		errors.push(
			"nexus invokes the raw `nexus-graph` binary; use `scripts/nexus-mcp.js` instead",
		);
	}
	for (const required of ["./scripts/nexus-mcp.js", "server", "--project", "."]) {
		if (!args.includes(required)) {
			errors.push(`nexus args missing \`${required}\``);
		}
	}
	for (const [key, value] of Object.entries(REQUIRED_NEXUS_ENV)) {
		if (server.env?.[key] !== value) {
			errors.push(`nexus env \`${key}\` is \`${server.env?.[key]}\`, expected \`${value}\``);
		}
	}
}

let failed = false;
for (const { path, read } of CONFIGS) {
	const errors = [];
	let servers;
	try {
		servers = read(readFileSync(path, "utf8"));
	} catch (err) {
		console.error(`✗ ${path}: could not read/parse (${err.message})`);
		failed = true;
		continue;
	}
	checkSerena(servers.serena, errors);
	checkNexus(servers.nexus, errors);
	if (errors.length > 0) {
		failed = true;
		console.error(`✗ ${path}`);
		for (const e of errors) console.error(`    - ${e}`);
	} else {
		console.log(`✓ ${path}`);
	}
}

if (failed) {
	console.error("\nMCP-config parity check failed. Align the assistant configs above.");
	process.exit(1);
}
console.log("\nAll MCP configs are consistent.");
