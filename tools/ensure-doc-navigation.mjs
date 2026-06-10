#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { relative, sep } from "node:path";

const CHECK_MODE = process.argv.includes("--check");
const DOCS_DIR = "docs";
const NAV_START = "<!-- docs-nav:start -->";
const NAV_END = "<!-- docs-nav:end -->";
const TOC_START = "<!-- docs-toc:start -->";
const TOC_END = "<!-- docs-toc:end -->";
const SECTION_NAV_START = "<!-- docs-section-nav:start -->";
const SECTION_NAV_END = "<!-- docs-section-nav:end -->";

function walkMarkdown(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		const path = `${dir}/${entry}`;
		const stat = statSync(path);
		if (stat.isDirectory()) {
			files.push(...walkMarkdown(path));
		} else if (path.endsWith(".md")) {
			files.push(path);
		}
	}
	return files.sort();
}

function stripGeneratedBlocks(markdown) {
	const blockPattern = new RegExp(
		`\\n?${escapeRegExp(NAV_START)}[\\s\\S]*?${escapeRegExp(NAV_END)}\\n?|\\n?${escapeRegExp(TOC_START)}[\\s\\S]*?${escapeRegExp(TOC_END)}\\n?|\\n?${escapeRegExp(SECTION_NAV_START)}[\\s\\S]*?${escapeRegExp(SECTION_NAV_END)}\\n?`,
		"gu",
	);
	return markdown.replace(blockPattern, "\n");
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function slugify(heading) {
	return heading
		.toLowerCase()
		.replace(/[<>]/gu, "")
		.replace(/[^\p{L}\p{N}\s-]/gu, "")
		.trim()
		.replace(/\s+/gu, "-");
}

function uniqueSlug(base, seen) {
	const current = seen.get(base) ?? 0;
	seen.set(base, current + 1);
	return current === 0 ? base : `${base}-${current}`;
}

function relativeDocsHome(file) {
	const fromDir = file.split("/").slice(0, -1).join("/") || ".";
	const homePath = `${DOCS_DIR}/Home.md`;
	const rel = relative(fromDir, homePath).split(sep).join("/");
	return rel === "" ? "Home.md" : rel;
}

function navigationLine(file) {
	return `[Home](${relativeDocsHome(file)}) · [Top](#top) · [Table of Contents](#table-of-contents)`;
}

function generateToc(headings) {
	if (headings.length === 0) {
		return "- [Top](#top)";
	}
	return headings
		.map(
			({ depth, text, slug }) =>
				`${"    ".repeat(Math.max(0, depth - 2))}- [${text}](#${slug})`,
		)
		.join("\n");
}

function normalizeBlankLines(markdown) {
	return markdown
		.replace(/\n{3,}/gu, "\n\n")
		.replace(/[ \t]+$/gmu, "")
		.trimEnd()
		.concat("\n");
}

function stripManualToc(markdown) {
	const lines = markdown.split("\n");
	const output = [];
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index] ?? "";
		if (!/^## Table of Contents\s*$/u.test(line)) {
			output.push(line);
			continue;
		}
		index += 1;
		while (index < lines.length) {
			const next = lines[index] ?? "";
			const isSkippable =
				next.trim() === "" ||
				/^<!-- docs-toc:(?:start|end) -->$/u.test(next.trim()) ||
				/^\s*[-*]\s+\[[^\]]+\]\([^)]*\)/u.test(next) ||
				/^\s*\d+\.\s+\[[^\]]+\]\([^)]*\)/u.test(next);
			if (!isSkippable) {
				index -= 1;
				break;
			}
			index += 1;
		}
	}
	return output.join("\n");
}

function updateFile(file) {
	const original = readFileSync(file, "utf8");
	const stripped = stripManualToc(
		stripGeneratedBlocks(original).replace(/<a id="top"><\/a>\n*/u, ""),
	);
	const lines = stripped.split("\n");
	const firstHeadingIndex = lines.findIndex((line) => /^#\s+\S/u.test(line));
	if (firstHeadingIndex === -1) {
		return original;
	}

	const seen = new Map();
	const headings = [];
	for (const line of lines) {
		const match = /^(#{2,6})\s+(.+?)\s*#*\s*$/u.exec(line);
		if (match === null) continue;
		const text = match[2]?.trim() ?? "";
		if (text === "Table of Contents") continue;
		const slug = uniqueSlug(slugify(text), seen);
		headings.push({ depth: match[1]?.length ?? 2, text, slug });
	}

	const nav = navigationLine(file);
	const headerBlocks = [
		"",
		'<a id="top"></a>',
		"",
		NAV_START,
		"",
		nav,
		"",
		NAV_END,
		"",
		"## Table of Contents",
		"",
		TOC_START,
		"",
		generateToc(headings),
		"",
		TOC_END,
	];
	lines.splice(firstHeadingIndex + 1, 0, ...headerBlocks);

	const outputLines = [];
	for (const line of lines) {
		outputLines.push(line);
		const match = /^(#{2,6})\s+(.+?)\s*#*\s*$/u.exec(line);
		if (match === null) continue;
		const heading = match[2]?.trim() ?? "";
		if (heading === "Table of Contents") continue;
		outputLines.push("", SECTION_NAV_START, "", nav, "", SECTION_NAV_END);
	}

	return normalizeBlankLines(outputLines.join("\n"));
}

const changed = [];
for (const file of walkMarkdown(DOCS_DIR)) {
	const original = readFileSync(file, "utf8");
	const updated = updateFile(file);
	if (updated !== original) {
		changed.push(file);
		if (!CHECK_MODE) {
			writeFileSync(file, updated);
		}
	}
}

if (changed.length > 0) {
	console.error(`docs navigation ${CHECK_MODE ? "out of date" : "updated"}:`);
	for (const file of changed) {
		console.error(`- ${file}`);
	}
	if (CHECK_MODE) {
		process.exit(1);
	}
}
