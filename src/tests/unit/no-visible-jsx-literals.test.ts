import fs from "node:fs";
import path from "node:path";

import { parse } from "@babel/parser";
import traverse, { type TraverseOptions } from "@babel/traverse";

const SOURCE_ROOTS = ["app", "components"] as const;
// `global-error.tsx` is the root error boundary: Next.js renders it *outside* the
// locale layout (no `NextIntlClientProvider`), so it cannot read locale messages
// and must ship self-contained English copy. It is exempt from the no-literals rule.
const EXCLUDED_FILES = new Set(["app/global-error.tsx"]);
const CHECKED_ATTRIBUTES = new Set(["alt", "aria-label", "placeholder", "title"]);
const ALLOWED_LITERAL_PATTERN =
	/^(?:[A-Z]{2,}|0x\.\.\.|0x...|404|#|%|ETH|USDC|SOL|HTML|FAQ|URL|URI|IPFS|ENS|API|JSON|PDF|AR|KB|SF|TrustLedger|WalletConnect|Reown|Sepolia|Solana Devnet|Arbitrum One|Base|Optimism|GitHub|LinkedIn|Kevin Le|Kellen Snider|© 2026 TrustLedger)$/u;

function collectSourceFiles(directory: string): string[] {
	const entries = fs.readdirSync(directory, { withFileTypes: true });
	return entries.flatMap((entry) => {
		if ([".next", ".swc", "coverage", "node_modules"].includes(entry.name)) return [];
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) return collectSourceFiles(entryPath);
		return /\.(?:jsx|tsx)$/u.test(entry.name) ? [entryPath] : [];
	});
}

function normalizeJsxText(value: string): string {
	return value.replace(/\s+/gu, " ").trim();
}

function isAllowedLiteral(value: string): boolean {
	if (value === "") return true;
	if (!/[A-Za-z]/u.test(value)) return true;
	if (ALLOWED_LITERAL_PATTERN.test(value)) return true;
	if (/^[#·:()\-–—.,%0-9\s]+$/u.test(value)) return true;
	return false;
}

describe("visible JSX copy", () => {
	it("uses locale messages instead of hard-coded English literals", () => {
		const sourceRoot = process.cwd();
		const files = SOURCE_ROOTS.flatMap((directory) =>
			collectSourceFiles(path.join(sourceRoot, directory)),
		).filter((file) => !EXCLUDED_FILES.has(path.relative(sourceRoot, file)));
		const violations: string[] = [];

		for (const file of files) {
			const source = fs.readFileSync(file, "utf8");
			const ast = parse(source, {
				sourceType: "module",
				plugins: ["jsx", "typescript"],
			});

			const visitors: TraverseOptions = {
				JSXText(nodePath) {
					const text = normalizeJsxText(nodePath.node.value);
					if (isAllowedLiteral(text)) return;
					const line = nodePath.node.loc?.start.line ?? 1;
					violations.push(
						`${path.relative(sourceRoot, file)}:${line.toString()}: ${text}`,
					);
				},
				JSXAttribute(nodePath) {
					const attributeName = nodePath.node.name;
					if (attributeName.type !== "JSXIdentifier") return;
					if (!CHECKED_ATTRIBUTES.has(attributeName.name)) return;
					const attributeValue = nodePath.node.value;
					if (attributeValue?.type !== "StringLiteral") return;
					const text = normalizeJsxText(attributeValue.value);
					if (isAllowedLiteral(text)) return;
					const line = nodePath.node.loc?.start.line ?? 1;
					violations.push(
						`${path.relative(sourceRoot, file)}:${line.toString()}: ${attributeName.name}="${text}"`,
					);
				},
			};
			traverse(ast, visitors);
		}

		expect(violations).toEqual([]);
	});
});
