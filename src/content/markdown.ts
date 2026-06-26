/**
 * Minimal, dependency-free Markdown block parser shared by every content
 * surface (legal documents today; docs/licenses pages in future). It turns raw
 * markdown into a typed block list that {@link "./MarkdownContent"} renders.
 *
 * The grammar is intentionally small — headings, paragraphs, blockquotes,
 * ordered/unordered lists, GitHub-style tables, and horizontal rules — matching
 * the structure used across the project's checked-in markdown. Inline emphasis,
 * strong, and links are handled at render time by `MarkdownContent`.
 *
 * Keeping this pure (no JSX, no React) makes it tree-shakeable and usable from
 * server components, scripts, or tests without pulling in the renderer.
 */

export type MarkdownBlock =
	| { readonly type: "blockquote"; readonly lines: readonly string[] }
	| { readonly type: "heading"; readonly depth: number; readonly text: string }
	| { readonly type: "list"; readonly ordered: boolean; readonly items: readonly string[] }
	| { readonly type: "paragraph"; readonly text: string }
	| { readonly type: "rule" }
	| {
			readonly type: "table";
			readonly headers: readonly string[];
			readonly rows: readonly string[][];
	  };

function isTableSeparator(line: string): boolean {
	return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function splitTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => cell.trim());
}

/** Parse a markdown string into a flat list of typed blocks. */
export function parseMarkdown(markdown: string): MarkdownBlock[] {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const blocks: MarkdownBlock[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index] ?? "";
		const trimmed = line.trim();

		if (trimmed === "") {
			index += 1;
			continue;
		}

		const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
		if (heading !== null) {
			blocks.push({
				type: "heading",
				depth: heading[1]?.length ?? 2,
				text: heading[2] ?? "",
			});
			index += 1;
			continue;
		}

		if (/^-{3,}$/.test(trimmed)) {
			blocks.push({ type: "rule" });
			index += 1;
			continue;
		}

		if (
			trimmed.startsWith("|") &&
			index + 1 < lines.length &&
			isTableSeparator(lines[index + 1] ?? "")
		) {
			const headers = splitTableRow(trimmed);
			const rows: string[][] = [];
			index += 2;
			while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
				rows.push(splitTableRow(lines[index] ?? ""));
				index += 1;
			}
			blocks.push({ type: "table", headers, rows });
			continue;
		}

		if (trimmed.startsWith(">")) {
			const quoteLines: string[] = [];
			while (index < lines.length && (lines[index] ?? "").trim().startsWith(">")) {
				quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
				index += 1;
			}
			blocks.push({ type: "blockquote", lines: quoteLines });
			continue;
		}

		const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
		const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
		if (unordered !== null || ordered !== null) {
			const items: string[] = [];
			const orderedList = ordered !== null;
			while (index < lines.length) {
				const itemLine = (lines[index] ?? "").trim();
				const match = orderedList
					? /^\d+\.\s+(.+)$/.exec(itemLine)
					: /^[-*]\s+(.+)$/.exec(itemLine);
				if (match === null) break;
				items.push(match[1] ?? "");
				index += 1;
			}
			blocks.push({ type: "list", ordered: orderedList, items });
			continue;
		}

		const paragraphLines: string[] = [];
		while (index < lines.length) {
			const paragraphLine = lines[index] ?? "";
			const paragraphTrimmed = paragraphLine.trim();
			if (
				paragraphTrimmed === "" ||
				/^(#{1,6})\s+/.test(paragraphTrimmed) ||
				paragraphTrimmed.startsWith(">") ||
				paragraphTrimmed.startsWith("|") ||
				/^[-*]\s+/.test(paragraphTrimmed) ||
				/^\d+\.\s+/.test(paragraphTrimmed) ||
				/^-{3,}$/.test(paragraphTrimmed)
			) {
				break;
			}
			paragraphLines.push(paragraphTrimmed);
			index += 1;
		}
		blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
	}

	return blocks;
}
