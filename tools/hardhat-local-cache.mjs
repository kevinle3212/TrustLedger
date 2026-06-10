#!/usr/bin/env node

import { spawn } from "node:child_process";
import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import envPaths from "env-paths";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localHome = path.join(repositoryRoot, "hardhat-cache", "home");
const localXdgCache = path.join(repositoryRoot, "hardhat-cache", "xdg-cache");
const hardhatCli = path.join(repositoryRoot, "node_modules", "hardhat", "dist", "src", "cli.js");

function getLocalHardhatCacheDir() {
	if (process.platform === "darwin") {
		return path.join(localHome, "Library", "Caches", "hardhat-nodejs");
	}
	if (process.platform === "win32") {
		return path.join(localHome, "AppData", "Local", "hardhat-nodejs", "Cache");
	}
	return path.join(localXdgCache, "hardhat-nodejs");
}

async function exists(filePath) {
	try {
		await stat(filePath);
		return true;
	} catch {
		return false;
	}
}

async function seedCompilerCache() {
	const originalCacheDir = envPaths("hardhat").cache;
	const originalCompilerCacheDir = path.join(originalCacheDir, "compilers-v3");
	const localCompilerCacheDir = path.join(getLocalHardhatCacheDir(), "compilers-v3");

	if (
		!(await exists(path.join(localCompilerCacheDir, "wasm", "list.json"))) &&
		(await exists(originalCompilerCacheDir))
	) {
		await mkdir(path.dirname(localCompilerCacheDir), { recursive: true });
		await cp(originalCompilerCacheDir, localCompilerCacheDir, { recursive: true });
	}
}

await seedCompilerCache();

const child = spawn(process.execPath, [hardhatCli, ...process.argv.slice(2)], {
	env: {
		...process.env,
		HOME: localHome,
		XDG_CACHE_HOME: localXdgCache,
	},
	stdio: "inherit",
});

child.on("exit", (code, signal) => {
	if (signal !== null) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 1);
});
