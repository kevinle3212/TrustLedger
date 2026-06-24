import codebaseStats from "@/content/codebase-stats.json";

/** Aggregate line, file, directory, and language counts for the codebase. */
interface CodebaseStatsTotals {
	readonly files: number;
	readonly directories: number;
	readonly lines: number;
	readonly bytes: number;
	readonly languages: number;
}

/** Per-language contribution to the tracked codebase. */
interface CodebaseLanguageStat {
	readonly name: string;
	readonly files: number;
	readonly lines: number;
	/** Percentage of total counted lines, rounded to one decimal place. */
	readonly share: number;
}

/** Build-time snapshot of the codebase scale, generated from git-tracked files. */
export interface CodebaseStats {
	/** ISO-8601 timestamp of when the snapshot was generated. */
	readonly generatedAt: string;
	readonly totals: CodebaseStatsTotals;
	readonly languages: readonly CodebaseLanguageStat[];
}

/**
 * Returns the generated codebase statistics snapshot.
 *
 * The data is produced at build time by `scripts/generate-codebase-stats.mjs`
 * and bundled as JSON, so this read never touches the filesystem at runtime.
 */
export function getCodebaseStats(): CodebaseStats {
	return codebaseStats;
}
