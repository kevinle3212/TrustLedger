#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);

const DEFAULT_MAX_TREE_SITTER_TS_BYTES = 35_000;
const DEFAULT_MCP_TIMEOUT_MS = 120_000;

function parsePositiveInt(value, fallback) {
	if (value === undefined) {
		return fallback;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const MAX_TREE_SITTER_TS_BYTES = parsePositiveInt(
	process.env.NEXUS_MAX_TREE_SITTER_TS_BYTES,
	DEFAULT_MAX_TREE_SITTER_TS_BYTES,
);
const MCP_TIMEOUT_MS = parsePositiveInt(process.env.NEXUS_MCP_TIMEOUT_MS, DEFAULT_MCP_TIMEOUT_MS);

function printUsage() {
	console.log(`Usage: node scripts/nexus-mcp.js <index|server> [--project <path>] [--timeout-ms <ms>]

Commands:
  index    Build the Nexus graph index for the project.
  server   Start the Nexus MCP server. This is the default.

Options:
  -p, --project <path>  Project directory. Defaults to current directory.
  --timeout-ms <ms>     Reserved Claude/Nexus timeout hint. Defaults to ${DEFAULT_MCP_TIMEOUT_MS}.
  -h, --help            Show this help.`);
}

function parseProjectArg(argv) {
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if ((arg === "--project" || arg === "-p") && argv[i + 1] !== undefined) {
			return argv[i + 1];
		}
	}
	return ".";
}

function parseTimeoutArg(argv) {
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i] === "--timeout-ms" && argv[i + 1] !== undefined) {
			return parsePositiveInt(argv[i + 1], MCP_TIMEOUT_MS);
		}
	}
	return MCP_TIMEOUT_MS;
}

function parseCommandArg(argv) {
	const project = parseProjectArg(argv);
	const timeout = String(parseTimeoutArg(argv));
	const command = argv.find((arg) => !arg.startsWith("-") && arg !== project && arg !== timeout);
	return command === "index" || command === "server" ? command : "server";
}

function requireNexusModule(modulePath) {
	try {
		return require(modulePath);
	} catch (err) {
		console.error(`Unable to load ${modulePath}. Run npm install in the repository root.`);
		throw err;
	}
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
	printUsage();
	process.exit(0);
}

for (let i = 0; i < argv.length; i += 1) {
	const arg = argv[i];
	if (
		(arg === "--project" || arg === "-p" || arg === "--timeout-ms") &&
		argv[i + 1] === undefined
	) {
		console.error(`${arg} requires a project path.`);
		printUsage();
		process.exit(2);
	}
	if (arg.startsWith("-") && arg !== "--project" && arg !== "-p" && arg !== "--timeout-ms") {
		console.error(`Unknown option: ${arg}`);
		printUsage();
		process.exit(2);
	}
}

process.env.NEXUS_MCP_TIMEOUT_MS = String(parseTimeoutArg(argv));

const parserModule = requireNexusModule(
	"../node_modules/@costline/nexus-graph/dist/indexer/parser.js",
);
const originalParseFile = parserModule.parseFile;

parserModule.parseFile = function parseFileWithLargeTypeScriptGuard(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	// tree-sitter-typescript throws Invalid argument on large TS inputs in this runtime.
	if (
		(ext === ".ts" || ext === ".tsx") &&
		fs.statSync(filePath).size > MAX_TREE_SITTER_TS_BYTES
	) {
		return { symbols: [], imports: [] };
	}
	return originalParseFile(filePath);
};

const { startMCPServer } = requireNexusModule(
	"../node_modules/@costline/nexus-graph/dist/mcp/server.js",
);
const { runIndexer } = requireNexusModule(
	"../node_modules/@costline/nexus-graph/dist/indexer/indexFile.js",
);

const command = parseCommandArg(argv);
const project = parseProjectArg(argv);

const action = command === "index" ? runIndexer(project) : startMCPServer(project);

Promise.resolve(action).catch((err) => {
	console.error(err);
	process.exit(1);
});
