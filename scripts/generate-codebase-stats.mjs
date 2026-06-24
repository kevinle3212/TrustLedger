#!/usr/bin/env node
// Generates a privacy-safe snapshot of the codebase's scale (lines of code,
// file and directory counts, and a per-language breakdown) into
// `src/content/codebase-stats.json`. The output is read by the public
// `/stats` page and the `GET /api/analytics/codebase` route.
//
// Only git-tracked files are inspected, so untracked secrets, `node_modules`,
// build output, and `.gitignore`d paths are never read. Lockfiles and binary
// assets are excluded from line counts to keep the language breakdown honest.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { dirname, extname, join, basename } from "node:path";

/** Maps a file extension (lower-case, no dot) to a display language name. */
const LANGUAGE_BY_EXTENSION = {
	ts: "TypeScript",
	tsx: "TypeScript",
	mts: "TypeScript",
	cts: "TypeScript",
	js: "JavaScript",
	jsx: "JavaScript",
	mjs: "JavaScript",
	cjs: "JavaScript",
	sol: "Solidity",
	rs: "Rust",
	py: "Python",
	json: "JSON",
	md: "Markdown",
	mdx: "Markdown",
	css: "CSS",
	scss: "CSS",
	html: "HTML",
	yml: "YAML",
	yaml: "YAML",
	toml: "TOML",
	sh: "Shell",
	bash: "Shell",
	sql: "SQL",
};

/** Tracked files whose lines should not skew the language breakdown. */
const LINE_COUNT_EXCLUDED_BASENAMES = new Set([
	"package-lock.json",
	"yarn.lock",
	"pnpm-lock.yaml",
	"Cargo.lock",
	"poetry.lock",
]);

/** Resolves the repository root so the script works from any working directory. */
function repositoryRoot() {
	return execFileSync("git", ["rev-parse", "--show-toplevel"], {
		encoding: "utf8",
	}).trim();
}

/** Lists every git-tracked file path relative to the repository root. */
function trackedFiles(root) {
	return execFileSync("git", ["-C", root, "ls-files"], {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	})
		.split("\n")
		.filter((line) => line.length > 0);
}

/** Counts newline-delimited lines in a UTF-8 file; trailing content counts as a line. */
function countLines(absolutePath) {
	const contents = readFileSync(absolutePath, "utf8");
	if (contents.length === 0) return 0;
	const newlines = contents.split("\n").length;
	return contents.endsWith("\n") ? newlines - 1 : newlines;
}

function main() {
	const root = repositoryRoot();
	const files = trackedFiles(root);

	const directories = new Set();
	const languages = new Map();
	let totalLines = 0;
	let totalBytes = 0;
	let countedFiles = 0;

	for (const relativePath of files) {
		const absolutePath = join(root, relativePath);
		let stats;
		try {
			stats = statSync(absolutePath);
		} catch {
			continue; // Submodule gitlinks and removed-but-tracked paths.
		}
		if (!stats.isFile()) continue;

		countedFiles += 1;
		totalBytes += stats.size;

		// Record every ancestor directory segment for an honest directory count.
		let parent = dirname(relativePath);
		while (parent !== "." && parent !== "") {
			directories.add(parent);
			parent = dirname(parent);
		}

		const extension = extname(relativePath).slice(1).toLowerCase();
		const language = LANGUAGE_BY_EXTENSION[extension];
		if (language === undefined) continue;
		if (LINE_COUNT_EXCLUDED_BASENAMES.has(basename(relativePath))) continue;

		let lines;
		try {
			lines = countLines(absolutePath);
		} catch {
			continue; // Binary content mislabelled by extension; skip safely.
		}

		totalLines += lines;
		const entry = languages.get(language) ?? { name: language, files: 0, lines: 0 };
		entry.files += 1;
		entry.lines += lines;
		languages.set(language, entry);
	}

	const languageBreakdown = [...languages.values()]
		.map((entry) => ({
			...entry,
			share: totalLines === 0 ? 0 : Math.round((entry.lines / totalLines) * 1000) / 10,
		}))
		.sort((a, b) => b.lines - a.lines);

	const snapshot = {
		generatedAt: new Date().toISOString(),
		totals: {
			files: countedFiles,
			directories: directories.size,
			lines: totalLines,
			bytes: totalBytes,
			languages: languageBreakdown.length,
		},
		languages: languageBreakdown,
	};

	const outputDir = join(root, "src", "content");
	mkdirSync(outputDir, { recursive: true });
	const outputPath = join(outputDir, "codebase-stats.json");
	writeFileSync(outputPath, `${JSON.stringify(snapshot, null, "\t")}\n`, "utf8");

	process.stdout.write(
		`Codebase stats: ${snapshot.totals.lines.toLocaleString()} lines across ` +
			`${snapshot.totals.files.toLocaleString()} files, ${snapshot.totals.languages} languages -> ${outputPath}\n`,
	);
}

main();
