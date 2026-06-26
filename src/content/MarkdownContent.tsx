import { type MarkdownBlock, parseMarkdown } from "./markdown";

/**
 * Server-rendered Markdown renderer shared by every content surface. It parses
 * a markdown string with {@link parseMarkdown} and renders the resulting blocks
 * with the project's Tailwind prose styling, plus safe inline emphasis, strong,
 * and links.
 *
 * No `"use client"` — this renders fully on the server so content pages ship
 * zero extra client JavaScript. To render a new markdown document, a page only
 * needs to load the source and pass it as {@link MarkdownContentProps.markdown}.
 *
 * @example
 * const markdown = await loadContentMarkdown(CONTENT_COLLECTIONS.legal, file, locale);
 * return <MarkdownContent markdown={markdown} />;
 */

function isSafeHref(href: string): boolean {
	return /^(https?:\/\/|mailto:|\/)/.test(href);
}

function keyPart(value: number): string {
	return String(value);
}

function EmphasisText({
	text,
	keyPrefix,
}: {
	readonly text: string;
	readonly keyPrefix: string;
}): React.JSX.Element {
	const nodes: React.ReactNode[] = [];
	const emphasisPattern = /(^|[^\w])_([^_\n]+)_(?!\w)/g;
	let cursor = 0;
	let match: RegExpExecArray | null;

	while ((match = emphasisPattern.exec(text)) !== null) {
		const prefix = match[1] ?? "";
		const emphasis = match[2] ?? "";
		if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
		if (prefix !== "") nodes.push(prefix);
		nodes.push(<em key={`${keyPrefix}-em-${keyPart(match.index)}`}>{emphasis}</em>);
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) nodes.push(text.slice(cursor));

	return <>{nodes}</>;
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
		if (match.index > cursor) {
			nodes.push(
				<EmphasisText
					key={`${keyPrefix}-t${keyPart(cursor)}`}
					text={text.slice(cursor, match.index)}
					keyPrefix={`${keyPrefix}-t${keyPart(cursor)}`}
				/>,
			);
		}
		nodes.push(<strong key={`${keyPrefix}-strong-${keyPart(match.index)}`}>{match[1]}</strong>);
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) {
		nodes.push(
			<EmphasisText
				key={`${keyPrefix}-tail`}
				text={text.slice(cursor)}
				keyPrefix={`${keyPrefix}-tail`}
			/>,
		);
	}

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
	const blockKey = `content-block-${keyPart(index)}`;

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
				<div
					// react-doctor-disable-next-line react-doctor/no-noninteractive-tabindex -- A keyboard-scrollable region must be focusable so keyboard users can scroll wide tables; this is the WCAG fix axe's scrollable-region-focusable rule requires.
					tabIndex={0}
					className="mt-6 overflow-x-auto rounded-xl border border-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10"
				>
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

interface MarkdownContentProps {
	/** Raw markdown source to parse and render. */
	readonly markdown: string;
}

/** Parse and render a markdown document as styled, server-rendered prose. */
export function MarkdownContent({ markdown }: MarkdownContentProps): React.JSX.Element {
	const blocks = parseMarkdown(markdown);
	return (
		<>
			{blocks.map((block, index) => (
				<MarkdownBlockView
					key={`content-block-${keyPart(index)}`}
					block={block}
					index={index}
				/>
			))}
		</>
	);
}
