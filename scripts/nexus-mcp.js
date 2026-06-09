#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MAX_TREE_SITTER_TS_BYTES = 35_000;

function printUsage() {
	console.log(`Usage: node scripts/nexus-mcp.js <index|server> [--project <path>]

Commands:
  index    Build the Nexus graph index for the project.
  server   Start the Nexus MCP server. This is the default.

Options:
  -p, --project <path>  Project directory. Defaults to current directory.
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

function parseCommandArg(argv) {
	const project = parseProjectArg(argv);
	const command = argv.find((arg) => !arg.startsWith("-") && arg !== project);
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
	if ((arg === "--project" || arg === "-p") && argv[i + 1] === undefined) {
		console.error(`${arg} requires a project path.`);
		printUsage();
		process.exit(2);
	}
	if (arg.startsWith("-") && arg !== "--project" && arg !== "-p") {
		console.error(`Unknown option: ${arg}`);
		printUsage();
		process.exit(2);
	}
}

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
