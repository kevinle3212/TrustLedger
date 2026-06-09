import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
	getLegalDocumentBySlug,
	LEGAL_DOCUMENTS,
	type LegalDocument,
	resolveLegalLocale,
} from "@/helpers/legal-docs";

interface LegalDocPageParams {
	locale: string;
	slug: string;
}

type MarkdownBlock =
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

function legalMarkdownPath(relativePath: string): string {
	return fileURLToPath(new URL(relativePath, import.meta.url));
}

const LEGAL_MARKDOWN_READERS: Record<LegalDocument["slug"], () => Promise<string>> = {
	"acceptable-use": async () =>
		await readFile(legalMarkdownPath("../../../../../ACCEPTABLE_USE_POLICY.md"), "utf8"),
	"community": async () =>
		await readFile(legalMarkdownPath("../../../../../COMMUNITY_GUIDELINES.md"), "utf8"),
	"content": async () =>
		await readFile(legalMarkdownPath("../../../../../CONTENT_POLICY.md"), "utf8"),
	"cookies": async () =>
		await readFile(legalMarkdownPath("../../../../../COOKIE_POLICY.md"), "utf8"),
	"disclaimer": async () =>
		await readFile(legalMarkdownPath("../../../../../DISCLAIMER.md"), "utf8"),
	"dmca": async () => await readFile(legalMarkdownPath("../../../../../DMCA_POLICY.md"), "utf8"),
	"privacy": async () =>
		await readFile(legalMarkdownPath("../../../../../PRIVACY_POLICY.md"), "utf8"),
	"risk": async () =>
		await readFile(legalMarkdownPath("../../../../../RISK_DISCLOSURE.md"), "utf8"),
	"security": async () => await readFile(legalMarkdownPath("../../../../../SECURITY.md"), "utf8"),
	"terms": async () =>
		await readFile(legalMarkdownPath("../../../../../TERMS_AND_CONDITIONS.md"), "utf8"),
	"trademark": async () =>
		await readFile(legalMarkdownPath("../../../../../TRADEMARK_POLICY.md"), "utf8"),
};

export function generateStaticParams(): LegalDocPageParams[] {
	return LEGAL_DOCUMENTS.flatMap((document) =>
		["en", "es", "vi", "pt", "zh-CN", "ar", "fr", "hi"].map((locale) => ({
			locale,
			slug: document.slug,
		})),
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<LegalDocPageParams>;
}): Promise<Metadata> {
	const { slug } = await params;
	const document = getLegalDocumentBySlug(slug);
	if (document === undefined) {
		return { title: "Legal document not found - TrustLedger" };
	}

	return {
		title: `${document.title} - TrustLedger Legal Center`,
		description: document.description,
	};
}

async function readLegalMarkdown(document: LegalDocument): Promise<string> {
	return await LEGAL_MARKDOWN_READERS[document.slug]();
}

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

function parseMarkdown(markdown: string): MarkdownBlock[] {
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

function isSafeHref(href: string): boolean {
	return /^(https?:\/\/|mailto:|\/)/.test(href);
}

function keyPart(value: number): string {
	return String(value);
}

function StrongText({
	text,
	keyPrefix,
}: {
	readonly text: string;
	readonly keyPrefix: string;
}): React.JSX.Element {
	const nodes: React.ReactNode[] = [];
	const strongPattern = /\*\*([^*]+)\*\*/g;
	let cursor = 0;
	let match: RegExpExecArray | null;

	while ((match = strongPattern.exec(text)) !== null) {
		if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
		nodes.push(<strong key={`${keyPrefix}-strong-${keyPart(match.index)}`}>{match[1]}</strong>);
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) nodes.push(text.slice(cursor));

	return <>{nodes}</>;
}

function InlineText({
	text,
	keyPrefix,
}: {
	readonly text: string;
	readonly keyPrefix: string;
}): React.JSX.Element {
	const nodes: React.ReactNode[] = [];
	const linkPattern = /\[([^\]]+)]\(([^)]+)\)/g;
	let cursor = 0;
	let match: RegExpExecArray | null;

	while ((match = linkPattern.exec(text)) !== null) {
		if (match.index > cursor) {
			nodes.push(
				<StrongText
					key={`${keyPrefix}-t${keyPart(cursor)}`}
					text={text.slice(cursor, match.index)}
					keyPrefix={`${keyPrefix}-t${keyPart(cursor)}`}
				/>,
			);
		}
		const label = match[1] ?? "";
		const href = match[2] ?? "";
		nodes.push(
			isSafeHref(href) ? (
				<a
					key={`${keyPrefix}-link-${keyPart(match.index)}`}
					href={href}
					className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-600 dark:text-indigo-300 dark:decoration-indigo-400/60 dark:hover:text-indigo-200"
				>
					<StrongText
						text={label}
						keyPrefix={`${keyPrefix}-label-${keyPart(match.index)}`}
					/>
				</a>
			) : (
				label
			),
		);
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) {
		nodes.push(
			<StrongText
				key={`${keyPrefix}-tail`}
				text={text.slice(cursor)}
				keyPrefix={`${keyPrefix}-tail`}
			/>,
		);
	}

	return <>{nodes}</>;
}

function MarkdownHeading({
	block,
	blockKey,
}: {
	readonly block: Extract<MarkdownBlock, { type: "heading" }>;
	readonly blockKey: string;
}): React.JSX.Element {
	const className =
		"mt-10 text-pretty font-semibold tracking-tight text-gray-950 dark:text-white";
	const content = <InlineText text={block.text} keyPrefix={blockKey} />;
	switch (block.depth) {
		case 1:
			return <h1 className={`${className} text-3xl`}>{content}</h1>;
		case 2:
			return <h2 className={`${className} text-2xl`}>{content}</h2>;
		case 3:
			return <h3 className={`${className} text-xl`}>{content}</h3>;
		default:
			return <h4 className={`${className} text-lg`}>{content}</h4>;
	}
}

function MarkdownBlockView({
	block,
	index,
}: {
	readonly block: MarkdownBlock;
	readonly index: number;
}): React.JSX.Element {
	const blockKey = `legal-block-${keyPart(index)}`;

	switch (block.type) {
		case "heading":
			return <MarkdownHeading block={block} blockKey={blockKey} />;
		case "paragraph":
			return (
				<p className="mt-4 max-w-3xl text-pretty leading-7 text-gray-700 dark:text-gray-300">
					<InlineText text={block.text} keyPrefix={blockKey} />
				</p>
			);
		case "blockquote":
			return (
				<blockquote className="mt-6 max-w-3xl rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-100">
					{block.lines.map((line, lineIndex) => (
						<p key={`${blockKey}-${keyPart(lineIndex)}`}>
							<InlineText
								text={line}
								keyPrefix={`${blockKey}-${keyPart(lineIndex)}`}
							/>
						</p>
					))}
				</blockquote>
			);
		case "list": {
			const ListTag = block.ordered ? "ol" : "ul";
			return (
				<ListTag
					className={`mt-4 max-w-3xl space-y-2 ps-6 text-gray-700 dark:text-gray-300 ${
						block.ordered ? "list-decimal" : "list-disc"
					}`}
				>
					{block.items.map((item, itemIndex) => (
						<li key={`${blockKey}-${keyPart(itemIndex)}`} className="leading-7">
							<InlineText
								text={item}
								keyPrefix={`${blockKey}-${keyPart(itemIndex)}`}
							/>
						</li>
					))}
				</ListTag>
			);
		}
		case "table":
			return (
				<div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
					<table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-white/10">
						<thead className="bg-gray-50 text-gray-950 dark:bg-white/5 dark:text-white">
							<tr>
								{block.headers.map((header, headerIndex) => (
									<th
										key={`${blockKey}-h-${keyPart(headerIndex)}`}
										className="px-4 py-3 font-semibold"
									>
										<InlineText
											text={header}
											keyPrefix={`${blockKey}-h-${keyPart(headerIndex)}`}
										/>
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white text-gray-700 dark:divide-white/10 dark:bg-gray-950 dark:text-gray-300">
							{block.rows.map((row, rowIndex) => (
								<tr key={`${blockKey}-r-${keyPart(rowIndex)}`}>
									{row.map((cell, cellIndex) => (
										<td
											key={`${blockKey}-r-${keyPart(rowIndex)}-${keyPart(cellIndex)}`}
											className="px-4 py-3 align-top"
										>
											<InlineText
												text={cell}
												keyPrefix={`${blockKey}-r-${keyPart(rowIndex)}-${keyPart(cellIndex)}`}
											/>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		case "rule":
			return <hr className="my-8 border-gray-200 dark:border-white/10" />;
	}
}

export default async function LegalDocumentPage({
	params,
}: {
	params: Promise<LegalDocPageParams>;
}): Promise<React.JSX.Element> {
	const { locale, slug } = await params;
	setRequestLocale(locale);

	const document = getLegalDocumentBySlug(slug);
	if (document === undefined) notFound();

	const markdown = await readLegalMarkdown(document);
	const blocks = parseMarkdown(markdown);
	const legalLocale = resolveLegalLocale(locale);

	return (
		<main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
			<Link
				href="/legal"
				className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
			>
				Back to legal center
			</Link>

			<header className="mt-8 max-w-3xl">
				<p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
					TrustLedger Legal Center
				</p>
				<h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-5xl">
					{document.title}
				</h1>
				<p className="mt-5 text-base leading-7 text-gray-600 dark:text-gray-300">
					{document.description}
				</p>
				<p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
					Source file: <span className="font-mono">{document.sourceFile}</span>. Locale:{" "}
					<span className="font-semibold">{legalLocale}</span>.
				</p>
			</header>

			<article className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-950 sm:p-8">
				{blocks.map((block, index) => (
					<MarkdownBlockView
						key={`legal-block-${keyPart(index)}`}
						block={block}
						index={index}
					/>
				))}
			</article>
		</main>
	);
}
