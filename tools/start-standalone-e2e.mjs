import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
	const key = process.argv[index];
	const value = process.argv[index + 1];
	if (key?.startsWith("--") === true && value !== undefined) {
		args.set(key.slice(2), value);
	}
}

process.env.HOSTNAME = args.get("hostname") ?? process.env.HOSTNAME ?? "127.0.0.1";
process.env.PORT = args.get("port") ?? process.env.PORT ?? "3000";

const standaloneEntrypoints = [
	resolve(".next/standalone/src/server.js"),
	resolve(".next/standalone/server.js"),
];
const serverEntry = standaloneEntrypoints.find((entry) => existsSync(entry));

if (serverEntry === undefined) {
	throw new Error("Missing Next standalone server. Run `npm run build:frontend` first.");
}

const serverRoot = dirname(serverEntry);
const standaloneNextDir = join(serverRoot, ".next");
mkdirSync(standaloneNextDir, { recursive: true });

const staticSource = resolve(".next/static");
if (existsSync(staticSource)) {
	const staticTarget = join(standaloneNextDir, "static");
	rmSync(staticTarget, { force: true, recursive: true });
	cpSync(staticSource, staticTarget, { recursive: true });
}

const publicSource = resolve("public");
if (existsSync(publicSource)) {
	const publicTarget = join(serverRoot, "public");
	rmSync(publicTarget, { force: true, recursive: true });
	cpSync(publicSource, publicTarget, { recursive: true });
}

await import(pathToFileURL(serverEntry).href);
