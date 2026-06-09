#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const checkExternal = args.has("--external");
const timeoutMs = Number.parseInt(process.env.DOC_LINK_TIMEOUT_MS ?? "10000", 10);
const roots = ["README.md", "src/README.md", "docs", "stubs/README.md"];
const skipDirs = new Set([
	".git",
	"node_modules",
	"src/node_modules",
	"site",
	".next",
	"src/.next",
	".vercel",
	"contracts/lib",
]);

function walk(target, files = []) {
	if (!fs.existsSync(target)) return files;
	const stat = fs.statSync(target);
	if (stat.isDirectory()) {
		for (const entry of fs.readdirSync(target)) {
			const child = path.join(target, entry);
			if (
				[...skipDirs].some(
					(skip) => child === skip || child.startsWith(`${skip}${path.sep}`),
				)
			) {
				continue;
			}
			walk(child, files);
		}
	} else if (target.endsWith(".md")) {
		files.push(target);
	}
	return files;
}

function extractLinks(file) {
	const text = fs.readFileSync(file, "utf8");
	const links = [];
	const inline = /!?\[[^\]]*]\(([^)]+)\)/g;
	for (const match of text.matchAll(inline)) {
		const raw = match[1].trim().replace(/^<|>$/g, "").split(/\s+/)[0];
		if (raw !== "") links.push({ file, raw });
	}
	return links;
}

function checkLocalLink({ file, raw }) {
	if (
		raw.startsWith("#") ||
		raw.startsWith("http://") ||
		raw.startsWith("https://") ||
		raw.startsWith("mailto:")
	) {
		return null;
	}
	const [target] = raw.split("#");
	if (target === undefined || target === "") return null;
	const resolved = path.normalize(path.join(path.dirname(file), decodeURIComponent(target)));
	return fs.existsSync(resolved) ? null : `${file}: ${raw} -> ${resolved}`;
}

function requestUrl(url, method) {
	return new Promise((resolve) => {
		const parsed = new URL(url);
		const client = parsed.protocol === "http:" ? http : https;
		const req = client.request(
			parsed,
			{
				method,
				timeout: timeoutMs,
				headers: {
					"user-agent": "TrustLedger-doc-link-check/1.0",
				},
			},
			(res) => {
				res.resume();
				resolve({
					ok:
						res.statusCode !== undefined &&
						res.statusCode >= 200 &&
						res.statusCode < 400,
					status: res.statusCode ?? 0,
				});
			},
		);
		req.on("timeout", () => {
			req.destroy();
			resolve({ ok: false, status: "timeout" });
		});
		req.on("error", (error) => {
			resolve({ ok: false, status: error.message });
		});
		req.end();
	});
}

async function checkExternalLink(url) {
	const head = await requestUrl(url, "HEAD");
	if (head.ok) return null;
	const get = await requestUrl(url, "GET");
	return get.ok ? null : `${url} -> HEAD ${head.status}, GET ${get.status}`;
}

function isExternalHttpUrl(raw) {
	if (!/^https?:\/\//.test(raw)) return false;
	const { hostname } = new URL(raw);
	return !["localhost", "127.0.0.1", "::1"].includes(hostname);
}

const files = roots.flatMap((root) => walk(root));
const links = files.flatMap(extractLinks);
const localFailures = links.map(checkLocalLink).filter((failure) => failure !== null);

if (localFailures.length > 0) {
	console.error(localFailures.join("\n"));
	process.exit(1);
}

if (checkExternal) {
	const externalUrls = [...new Set(links.map(({ raw }) => raw).filter(isExternalHttpUrl))];
	const externalFailures = [];
	for (const url of externalUrls) {
		const failure = await checkExternalLink(url);
		if (failure !== null) externalFailures.push(failure);
	}
	if (externalFailures.length > 0) {
		console.error(externalFailures.join("\n"));
		process.exit(1);
	}
	console.log(`checked ${files.length} markdown files and ${externalUrls.length} external URLs`);
} else {
	console.log(`checked ${files.length} markdown files; relative links exist`);
}
