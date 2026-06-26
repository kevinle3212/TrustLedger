#!/usr/bin/env node
// Generates a privacy-safe snapshot of the codebase's scale (lines of code,
// file and directory counts, and a per-category file-type breakdown) into
// `src/content/codebase-stats.json`. The output is read by the public
// `/stats` page and the `GET /api/analytics/codebase` route.
//
// Only git-tracked files are inspected, so untracked secrets, `node_modules`,
// build output, and `.gitignore`d paths are never read. Files are categorized
// by intelligent rules (special filenames, Docker variants, git hooks, license
// files, and shebangs) before falling back to their extension, so only the
// categories that actually exist in the repository are ever emitted — empty
// categories never appear. Placeholder/example/template and generated artifacts
// (lockfiles, snapshots) are excluded entirely so they cannot skew analytics.
// Binary asset categories (images, fonts, media, PDFs) are counted by presence
// without being read, keeping regeneration fast.

import { execFileSync } from "node:child_process";
import {
	readFileSync,
	writeFileSync,
	statSync,
	mkdirSync,
	openSync,
	readSync,
	closeSync,
} from "node:fs";
import { dirname, extname, join, basename } from "node:path";

/**
 * Categories whose members are binary or asset files. They are counted by file
 * presence only — never opened — so a multi-megabyte video or font never has to
 * be read into memory just to be tallied.
 */
const ASSET_CATEGORIES = new Set(["Images", "ICO", "SVG", "PDF", "Audio", "Video", "Fonts"]);

/**
 * Exact (case-insensitive) basenames mapped directly to a category. Covers
 * ignore/system dotfiles and a handful of special configuration files that have
 * no meaningful extension.
 */
const BASENAME_CATEGORY = new Map(
	Object.entries({
		".gitignore": "Ignore/System Files",
		".dockerignore": "Ignore/System Files",
		".eslintignore": "Ignore/System Files",
		".npmignore": "Ignore/System Files",
		".prettierignore": "Ignore/System Files",
		".vercelignore": "Ignore/System Files",
		".markdownlintignore": "Ignore/System Files",
		".gitleaksignore": "Ignore/System Files",
		".gitattributes": "Ignore/System Files",
		".gitmodules": "Ignore/System Files",
		".editorconfig": "Ignore/System Files",
		".nvmrc": "Ignore/System Files",
		".node-version": "Ignore/System Files",
		".python-version": "Ignore/System Files",
		".ruby-version": "Ignore/System Files",
		".tool-versions": "Ignore/System Files",
		".npmrc": "Configuration Files",
		".browserslistrc": "Configuration Files",
		"codeowners": "Configuration Files",
		"makefile": "Configuration Files",
	}),
);

/** File extension (lower-case, no dot) mapped to a display category. */
const EXTENSION_CATEGORY = {
	ts: "TypeScript",
	mts: "TypeScript",
	cts: "TypeScript",
	tsx: "React",
	jsx: "React",
	js: "JavaScript",
	mjs: "JavaScript",
	cjs: "JavaScript",
	py: "Python",
	pyi: "Python",
	pyw: "Python",
	rs: "Rust",
	sol: "Solidity",
	go: "Go",
	c: "C",
	h: "C",
	cc: "C++",
	cpp: "C++",
	cxx: "C++",
	hpp: "C++",
	hh: "C++",
	hxx: "C++",
	cs: "C#",
	php: "PHP",
	rb: "Ruby",
	json: "JSON",
	jsonc: "JSON",
	json5: "JSON",
	yml: "YAML",
	yaml: "YAML",
	toml: "TOML",
	xml: "XML",
	graphql: "GraphQL",
	gql: "GraphQL",
	sql: "SQL",
	md: "Markdown",
	mdx: "Markdown",
	markdown: "Markdown",
	mdc: "Markdown",
	css: "CSS",
	scss: "CSS",
	sass: "CSS",
	less: "CSS",
	html: "HTML",
	htm: "HTML",
	sh: "Shell",
	bash: "Shell",
	zsh: "Shell",
	fish: "Shell",
	ps1: "PowerShell",
	psm1: "PowerShell",
	txt: "Text Files",
	text: "Text Files",
	svg: "SVG",
	ico: "ICO",
	png: "Images",
	jpg: "Images",
	jpeg: "Images",
	gif: "Images",
	webp: "Images",
	avif: "Images",
	bmp: "Images",
	tiff: "Images",
	mp3: "Audio",
	wav: "Audio",
	ogg: "Audio",
	flac: "Audio",
	aac: "Audio",
	m4a: "Audio",
	mp4: "Video",
	webm: "Video",
	mov: "Video",
	avi: "Video",
	mkv: "Video",
	pdf: "PDF",
	woff: "Fonts",
	woff2: "Fonts",
	ttf: "Fonts",
	otf: "Fonts",
	eot: "Fonts",
	patch: "Patch",
	diff: "Patch",
	ini: "Configuration Files",
	cfg: "Configuration Files",
	conf: "Configuration Files",
	properties: "Configuration Files",
};

/**
 * The generated snapshot itself, relative to the repository root. Skipping it
 * breaks the self-reference: counting its own line and byte size would let each
 * regeneration perturb the next, defeating deterministic output.
 */
const GENERATED_SNAPSHOT_RELATIVE_PATH = "src/content/codebase-stats.json";

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

/**
 * Whether a tracked file must be ignored for analytics entirely (excluded from
 * totals and the category breakdown). Covers the generated snapshot,
 * placeholder/example/template files, and generated artifacts such as lockfiles
 * and Foundry gas snapshots, none of which represent authored source.
 */
function isExcludedFromAnalytics(relativePath, base) {
	if (relativePath === GENERATED_SNAPSHOT_RELATIVE_PATH) return true;
	if (/\.(?:example|sample|template|dist)$/iu.test(base)) return true;
	if (/\.(?:example|sample|template)\./iu.test(base)) return true;
	if (/\.lock$/iu.test(base)) return true;
	const generated = new Set([
		"package-lock.json",
		"yarn.lock",
		"pnpm-lock.yaml",
		"bun.lockb",
		"composer.lock",
		"poetry.lock",
		".gas-snapshot",
	]);
	if (generated.has(base)) return true;
	if (/\.(?:tsbuildinfo|min\.js|min\.css|map)$/iu.test(base)) return true;
	return false;
}

/** Reads the first line of a text file without loading the whole file. */
function readFirstLine(absolutePath) {
	const fd = openSync(absolutePath, "r");
	try {
		const buffer = Buffer.alloc(256);
		const bytes = readSync(fd, buffer, 0, buffer.length, 0);
		const text = buffer.toString("utf8", 0, bytes);
		const newline = text.indexOf("\n");
		return newline === -1 ? text : text.slice(0, newline);
	} finally {
		closeSync(fd);
	}
}

/** Maps a shebang interpreter line to a category, or undefined when unknown. */
function categoryFromShebang(absolutePath) {
	let firstLine;
	try {
		firstLine = readFirstLine(absolutePath);
	} catch {
		return undefined;
	}
	if (!firstLine.startsWith("#!")) return undefined;
	if (/\b(?:bash|sh|zsh|dash)\b/u.test(firstLine)) return "Shell";
	if (/python/u.test(firstLine)) return "Python";
	if (/node/u.test(firstLine)) return "JavaScript";
	if (/ruby/u.test(firstLine)) return "Ruby";
	return undefined;
}

/**
 * Determines the display category for a tracked file using intelligent rules
 * ahead of a plain extension lookup. Returns undefined when the file does not
 * map to any known category (it still counts toward file/byte totals).
 */
function categoryForFile(relativePath, absolutePath) {
	const base = basename(relativePath);
	const lower = base.toLowerCase();

	const exact = BASENAME_CATEGORY.get(lower);
	if (exact !== undefined) return exact;

	// Docker and its environment-specific variants (Dockerfile, Dockerfile.ci…).
	if (base === "Dockerfile" || base.startsWith("Dockerfile.") || /\.dockerfile$/iu.test(base)) {
		return "Docker";
	}

	// Git hooks live under `.husky/` and are POSIX shell without a shebang.
	if (relativePath.includes(".husky/") && extname(base) === "") return "Shell";

	// License manifests (LICENSE, LICENSE-MIT, LICENSE-APACHE…).
	if (/^license(?:[-.].+)?$/u.test(lower)) return "Text Files";

	const extension = extname(base).slice(1).toLowerCase();
	if (extension !== "") {
		const byExtension = EXTENSION_CATEGORY[extension];
		if (byExtension !== undefined) return byExtension;
	} else {
		const byShebang = categoryFromShebang(absolutePath);
		if (byShebang !== undefined) return byShebang;
	}

	// Remaining unmatched dotfiles are treated as configuration.
	if (base.startsWith(".") && extension === "") return "Configuration Files";

	return undefined;
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
	const categories = new Map();
	let totalLines = 0;
	let totalBytes = 0;
	let countedFiles = 0;

	for (const relativePath of files) {
		const base = basename(relativePath);
		if (isExcludedFromAnalytics(relativePath, base)) continue;

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

		const category = categoryForFile(relativePath, absolutePath);
		if (category === undefined) continue;

		// Asset categories are tallied by presence; only text is read for lines.
		let lines = 0;
		if (!ASSET_CATEGORIES.has(category)) {
			try {
				lines = countLines(absolutePath);
			} catch {
				continue; // Binary content mislabelled by extension; skip safely.
			}
		}

		totalLines += lines;
		const entry = categories.get(category) ?? { name: category, files: 0, lines: 0 };
		entry.files += 1;
		entry.lines += lines;
		categories.set(category, entry);
	}

	const categoryBreakdown = [...categories.values()]
		.map((entry) => ({
			...entry,
			share: totalLines === 0 ? 0 : Math.round((entry.lines / totalLines) * 1000) / 10,
		}))
		.sort((a, b) => b.lines - a.lines || b.files - a.files || a.name.localeCompare(b.name));

	const snapshot = {
		totals: {
			files: countedFiles,
			directories: directories.size,
			lines: totalLines,
			bytes: totalBytes,
			categories: categoryBreakdown.length,
		},
		categories: categoryBreakdown,
	};

	const outputDir = join(root, "src", "content");
	mkdirSync(outputDir, { recursive: true });
	const outputPath = join(outputDir, "codebase-stats.json");
	const serialized = `${JSON.stringify(snapshot, null, "\t")}\n`;

	// Idempotent write: the snapshot is a deterministic function of the tracked
	// fileset, so only rewrite when the computed bytes actually differ. Builds,
	// dev runs, and test runs that change no tracked source therefore never touch
	// this file's mtime or git status — it changes only on real code changes.
	let existing;
	try {
		existing = readFileSync(outputPath, "utf8");
	} catch {
		existing = undefined; // First generation, or the snapshot was removed.
	}
	if (existing === serialized) {
		process.stdout.write(`Codebase stats unchanged -> ${outputPath}\n`);
		return;
	}
	writeFileSync(outputPath, serialized, "utf8");

	process.stdout.write(
		`Codebase stats: ${snapshot.totals.lines.toLocaleString()} lines across ` +
			`${snapshot.totals.files.toLocaleString()} files, ${snapshot.totals.categories} categories -> ${outputPath}\n`,
	);
}

try {
	main();
} catch (error) {
	// Never fail the build over statistics: deployments fall back to the
	// committed `src/content/codebase-stats.json` snapshot when git or the
	// filesystem is unavailable in the build sandbox.
	process.stderr.write(
		`Skipping codebase stats regeneration: ${error instanceof Error ? error.message : String(error)}\n`,
	);
}
