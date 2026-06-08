#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MAX_TREE_SITTER_TS_BYTES = 35_000;

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
	const command = argv.find((arg) => !arg.startsWith("-") && arg !== parseProjectArg(argv));
	return command === "index" || command === "server" ? command : "server";
}

const parserModule = require("../node_modules/@costline/nexus-graph/dist/indexer/parser.js");
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

const { startMCPServer } = require("../node_modules/@costline/nexus-graph/dist/mcp/server.js");
const { runIndexer } = require("../node_modules/@costline/nexus-graph/dist/indexer/indexFile.js");

const argv = process.argv.slice(2);
const command = parseCommandArg(argv);
const project = parseProjectArg(argv);

const action = command === "index" ? runIndexer(project) : startMCPServer(project);

Promise.resolve(action).catch((err) => {
	console.error(err);
	process.exit(1);
});
