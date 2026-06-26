import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import type { ContentCollection } from "./registry";

/**
 * Server-only markdown loader for registry collections. Resolves a document's
 * source from disk with a deterministic fallback chain so localized overrides
 * are optional and the project's checked-in root markdown keeps working.
 *
 * Resolution order for a localized collection:
 *   1. `src/content/<id>/<locale>/<file>` — per-locale override.
 *   2. `src/content/<id>/<file>` — base (source-locale) copy.
 *   3. `<repo-root>/<file>` — canonical checked-in document.
 *
 * Non-localized collections skip step 1. Paths are resolved relative to this
 * module via `import.meta.url`, so Next.js file tracing includes the markdown
 * in the deployment bundle. Legal/content pages are statically generated, so
 * these reads run at build time.
 */

function contentPath(relativePath: string): string {
	return fileURLToPath(new URL(relativePath, import.meta.url));
}

async function readFirstExisting(
	paths: readonly string[],
	file: string,
	index = 0,
): Promise<string> {
	const path = paths[index];
	if (path === undefined) throw new Error(`Missing content markdown source: ${file}`);
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		return await readFirstExisting(paths, file, index + 1);
	}
}

/** Read a collection document's markdown, preferring a per-locale override. */
export async function loadContentMarkdown(
	collection: ContentCollection,
	file: string,
	locale: string,
): Promise<string> {
	const localePaths = collection.localized
		? [contentPath(`./${collection.id}/${locale}/${file}`)]
		: [];
	const paths = [
		...localePaths,
		contentPath(`./${collection.id}/${file}`),
		contentPath(`../../${file}`),
	];
	return await readFirstExisting(paths, file);
}
