import { LEGAL_DOCUMENTS } from "@/helpers/legal-docs";

/**
 * Content registry — the single manifest of markdown-backed content
 * collections rendered by the app. It is intentionally decoupled from UI
 * translation files (`messages/*.json`): those hold short interface strings,
 * while these collections describe long-form markdown documents that live under
 * `src/content/<collection>/`.
 *
 * ## Adding content with minimal configuration
 *
 * - **A new legal document:** add one entry to `LEGAL_DOCUMENTS` in
 *   `helpers/legal-docs.ts` and drop its markdown into `src/content/legal/`.
 *   The `legal` collection below derives from that list automatically.
 * - **A new collection** (e.g. `docs`, `licenses`): create
 *   `src/content/<id>/`, add the markdown files, then register a
 *   {@link ContentCollection} here. Render it with `loadContentMarkdown` +
 *   `MarkdownContent` — no bespoke parsing or fs wiring required.
 */

export type ContentCollectionId = "legal" | "docs" | "licenses";

export interface ContentDocument {
	/** Stable URL slug for the document. */
	readonly slug: string;
	/** Markdown filename within the collection directory. */
	readonly file: string;
}

export interface ContentCollection {
	/** Directory name under `src/content/` and registry key. */
	readonly id: ContentCollectionId;
	/**
	 * When true, the loader prefers a per-locale override at
	 * `src/content/<id>/<locale>/<file>` before the base file.
	 */
	readonly localized: boolean;
	readonly documents: readonly ContentDocument[];
}

const legalCollection: ContentCollection = {
	id: "legal",
	localized: true,
	documents: LEGAL_DOCUMENTS.map((document) => ({
		slug: document.slug,
		file: document.sourceFile,
	})),
};

export const CONTENT_COLLECTIONS = {
	legal: legalCollection,
} as const satisfies Record<string, ContentCollection>;

/** Look up a single document within a collection by slug. */
export function getContentDocument(
	collection: ContentCollection,
	slug: string,
): ContentDocument | undefined {
	return collection.documents.find((document) => document.slug === slug);
}
