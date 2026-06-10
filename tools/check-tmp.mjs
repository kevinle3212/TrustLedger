import { readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(repoRoot, "tmp");
const mode = process.argv.includes("--prune") ? "prune" : "check";

const maxFiles = Number(process.env.TRUSTLEDGER_TMP_MAX_FILES ?? 100);
const maxTotalBytes = Number(process.env.TRUSTLEDGER_TMP_MAX_BYTES ?? 50_000_000);
const maxFileBytes = Number(process.env.TRUSTLEDGER_TMP_MAX_FILE_BYTES ?? 10_000_000);
const maxAgeDays = Number(process.env.TRUSTLEDGER_TMP_MAX_AGE_DAYS ?? 7);
const now = Date.now();
const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

function walk(dir) {
	try {
		return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
			const absolutePath = path.join(dir, entry.name);
			if (entry.isDirectory()) return walk(absolutePath);
			if (!entry.isFile()) return [];
			const stats = statSync(absolutePath);
			return [
				{
					absolutePath,
					relativePath: path.relative(repoRoot, absolutePath),
					size: stats.size,
					mtimeMs: stats.mtimeMs,
				},
			];
		});
	} catch (error) {
		if (error?.code === "ENOENT") return [];
		throw error;
	}
}

const files = walk(tmpDir).sort((a, b) => a.mtimeMs - b.mtimeMs);
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const staleFiles = files.filter((file) => now - file.mtimeMs > maxAgeMs);
const oversizeFiles = files.filter((file) => file.size > maxFileBytes);
const excessFiles = files.slice(0, Math.max(0, files.length - maxFiles));
const overTotalBytes = totalBytes > maxTotalBytes;

if (mode === "prune") {
	const pruneSet = new Set([...staleFiles, ...oversizeFiles, ...excessFiles]);
	let runningBytes = totalBytes;
	for (const file of files) {
		if (runningBytes <= maxTotalBytes) break;
		pruneSet.add(file);
		runningBytes -= file.size;
	}

	for (const file of pruneSet) {
		rmSync(file.absolutePath, { force: true });
		console.log(`pruned ${file.relativePath}`);
	}

	console.log(`tmp prune complete: ${pruneSet.size} file(s) removed`);
	process.exit(0);
}

const problems = [
	...staleFiles.map((file) => `${file.relativePath} is older than ${maxAgeDays} days`),
	...oversizeFiles.map((file) => `${file.relativePath} exceeds ${maxFileBytes} bytes`),
	...(files.length > maxFiles
		? [`tmp/ contains ${files.length} files; limit is ${maxFiles}`]
		: []),
	...(overTotalBytes ? [`tmp/ totals ${totalBytes} bytes; limit is ${maxTotalBytes}`] : []),
];

if (problems.length > 0) {
	console.error("tmp/ retention check failed:");
	for (const problem of problems) console.error(`- ${problem}`);
	console.error("Run `npm run tmp:prune` or move useful artifacts out of tmp/.");
	process.exit(1);
}

console.log(`tmp/ retention ok: ${files.length} file(s), ${totalBytes} bytes`);
