#!/usr/bin/env node
/**
 * Verifies that root/`docs/` document mirrors have not drifted.
 *
 * Root legal drafts are canonical (owner-controlled); their `docs/` copies must
 * stay byte-identical. `CREDITS.md` and `AGENT-CONTEXT.md` are mirrored with
 * wiki chrome (nav, table of contents, legal footer) added on the `docs/`
 * side, so those pairs are compared after stripping that chrome.
 *
 * Exits non-zero and lists every drifted pair so the docs gate fails loudly.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const ROOT = resolve(import.meta.dirname, "..");

/** Pairs that must be byte-identical between root and docs/. */
const EXACT_MIRRORS = [
	"LICENSE",
	"PRIVACY_POLICY.md",
	"RISK_DISCLOSURE.md",
	"TERMS_AND_CONDITIONS.md",
];

/** Pairs compared after stripping docs-side wiki chrome. */
const BODY_MIRRORS = [
	"ACCEPTABLE_USE_POLICY.md",
	"AGENT-CONTEXT.md",
	"CREDITS.md",
	"DISCLAIMER.md",
];

/**
 * Removes wiki chrome so a docs/ page body can be compared with its root
 * counterpart.
 *
 * @param {string} text - Raw markdown content.
 * @returns {string} Normalized body content.
 */
function stripWikiChrome(text) {
	return text
		.replace(/<!-- docs-nav:start -->[\s\S]*?<!-- docs-nav:end -->/g, "")
		.replace(/<!-- docs-toc:start -->[\s\S]*?<!-- docs-toc:end -->/g, "")
		.replace(/<!-- docs-section-nav:start -->[\s\S]*?<!-- docs-section-nav:end -->/g, "")
		.replace(/<a id="top"><\/a>/g, "")
		.replace(/^## Table of Contents$/m, "")
		.replace(/\n## Legal\n[\s\S]*$/, "\n")
		.replace(/\n{2,}/g, "\n")
		.trim();
}

/**
 * Reads a repository file, returning null when it does not exist.
 *
 * @param {string} relativePath - Path relative to the repository root.
 * @returns {string | null} File content or null.
 */
function readOrNull(relativePath) {
	try {
		return readFileSync(resolve(ROOT, relativePath), "utf8");
	} catch {
		return null;
	}
}

const failures = [];

for (const name of [...EXACT_MIRRORS, ...BODY_MIRRORS]) {
	const rootContent = readOrNull(name);
	const docsContent = readOrNull(`docs/${name}`);
	if (rootContent === null || docsContent === null) {
		failures.push(`${name}: missing ${rootContent === null ? name : `docs/${name}`}`);
		continue;
	}
	const matches = EXACT_MIRRORS.includes(name)
		? rootContent === docsContent
		: stripWikiChrome(rootContent) === stripWikiChrome(docsContent);
	if (!matches) {
		failures.push(
			`${name}: root and docs/ copies have drifted (root is canonical for ` +
				`legal drafts; sync the docs/ mirror, keeping its wiki chrome)`,
		);
	}
}

if (failures.length > 0) {
	console.error("Doc mirror drift detected:\n");
	for (const failure of failures) {
		console.error(`  - ${failure}`);
	}
	console.error("\nFix by syncing the non-canonical copy, then rerun `npm run docs:mirrors`.");
	process.exit(1);
}

console.log(`Doc mirrors in sync (${EXACT_MIRRORS.length} exact, ${BODY_MIRRORS.length} body).`);
