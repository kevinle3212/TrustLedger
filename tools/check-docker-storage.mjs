#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const mode = process.argv.includes("--prune") ? "prune" : "check";
const maxBytes = Number(process.env.TRUSTLEDGER_DOCKER_MAX_BYTES ?? 5_000_000_000);

function formatBytes(bytes) {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1000 && unitIndex < units.length - 1) {
		value /= 1000;
		unitIndex += 1;
	}
	return `${value.toFixed(unitIndex === 0 ? 0 : 2)}${units[unitIndex]}`;
}

function parseDockerSize(size) {
	const match = /^([0-9]+(?:\.[0-9]+)?)\s*([KMGT]?B)$/i.exec(size.trim());
	if (!match) {
		throw new Error(`Unable to parse Docker size: ${size}`);
	}

	const value = Number(match[1]);
	const unit = match[2].toUpperCase();
	const multipliers = {
		B: 1,
		KB: 1000,
		MB: 1000 ** 2,
		GB: 1000 ** 3,
		TB: 1000 ** 4,
	};
	return Math.round(value * multipliers[unit]);
}

function runDocker(args) {
	const result = spawnSync("docker", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});

	if (result.error?.code === "ENOENT") {
		return { ok: false, unavailable: true, message: "Docker CLI is not installed." };
	}

	if (result.status !== 0) {
		return {
			ok: false,
			unavailable: true,
			message: result.stderr.trim() || result.stdout.trim() || "Docker command failed.",
		};
	}

	return { ok: true, stdout: result.stdout };
}

function readDockerUsage() {
	const result = runDocker(["system", "df", "--format", "json"]);
	if (!result.ok) {
		return result;
	}

	const rows = result.stdout
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => JSON.parse(line));

	const entries = rows.map((row) => ({
		type: row.Type,
		sizeBytes: parseDockerSize(row.Size),
		reclaimable: row.Reclaimable,
	}));
	const totalBytes = entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);

	return { ok: true, entries, totalBytes };
}

function printUsage(prefix, usage) {
	console.log(`${prefix}: ${formatBytes(usage.totalBytes)} total Docker storage`);
	for (const entry of usage.entries) {
		console.log(
			`- ${entry.type}: ${formatBytes(entry.sizeBytes)} (${entry.reclaimable} reclaimable)`,
		);
	}
}

const usage = readDockerUsage();
if (!usage.ok) {
	console.warn(`docker storage check skipped: ${usage.message}`);
	process.exit(0);
}

printUsage("docker storage", usage);

if (usage.totalBytes <= maxBytes) {
	console.log(`docker storage ok: below ${formatBytes(maxBytes)} threshold`);
	process.exit(0);
}

if (mode === "check") {
	console.error(
		`docker storage exceeds ${formatBytes(maxBytes)}. Run npm run docker:storage:prune.`,
	);
	process.exit(1);
}

console.log("docker storage exceeds threshold; running docker system prune -a --volumes -f");
const prune = spawnSync("docker", ["system", "prune", "-a", "--volumes", "-f"], {
	encoding: "utf8",
	stdio: ["ignore", "pipe", "pipe"],
});

if (prune.status !== 0) {
	console.error(prune.stderr.trim() || prune.stdout.trim() || "docker system prune failed.");
	process.exit(prune.status ?? 1);
}

if (prune.stdout.trim() !== "") {
	console.log(prune.stdout.trim());
}

const after = readDockerUsage();
if (after.ok) {
	printUsage("docker storage after prune", after);
	if (after.totalBytes > maxBytes) {
		console.error(
			`docker storage still exceeds ${formatBytes(maxBytes)} after pruning. Stop active containers or remove required images manually.`,
		);
		process.exit(1);
	}
}
