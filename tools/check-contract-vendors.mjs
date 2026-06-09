#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const checkRemote = args.has("--remote") || args.has("--update");
const failOnOutdated = args.has("--fail-on-outdated");
const update = args.has("--update");

const vendors = [
	{
		name: "OpenZeppelin Contracts",
		path: "contracts/lib/openzeppelin-contracts",
		submodule: true,
	},
	{
		name: "forge-std",
		path: "contracts/lib/forge-std",
		submodule: false,
	},
];

function runGit(gitArgs, options = {}) {
	return execFileSync("git", gitArgs, {
		cwd: options.cwd ?? repoRoot,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function remoteHeadRef(vendorPath) {
	const output = runGit(["ls-remote", "--symref", "origin", "HEAD"], {
		cwd: path.join(repoRoot, vendorPath),
	});
	const match = output.match(/^ref:\s+refs\/heads\/([^\s]+)\s+HEAD/mu);
	return match?.[1] ?? "master";
}

function assertClean(vendor) {
	const status = runGit(["-C", vendor.path, "status", "--porcelain"]);
	if (status !== "") {
		throw new Error(`${vendor.name} has uncommitted changes:\n${status}`);
	}

	if (!vendor.submodule) return;
	const submoduleStatus = runGit(["submodule", "status", "--recursive", vendor.path]);
	const dirtyLine = submoduleStatus
		.split("\n")
		.find((line) => line.startsWith("-") || line.startsWith("+") || line.startsWith("U"));
	if (dirtyLine !== undefined) {
		throw new Error(
			`${vendor.name} submodule is not at the pinned clean revision:\n${dirtyLine}`,
		);
	}
}

function vendorReport(vendor) {
	const vendorPath = path.join(repoRoot, vendor.path);
	const current = runGit(["rev-parse", "HEAD"], { cwd: vendorPath });
	const branch = remoteHeadRef(vendor.path);
	const latest = runGit(["ls-remote", "origin", `refs/heads/${branch}`], {
		cwd: vendorPath,
	}).split(/\s+/u)[0];
	const outdated = latest !== "" && current !== latest;
	return { ...vendor, branch, current, latest, outdated };
}

function updateVendor(vendor) {
	const branch = remoteHeadRef(vendor.path);
	runGit(["fetch", "--tags", "origin"], { cwd: path.join(repoRoot, vendor.path) });
	runGit(["checkout", `origin/${branch}`], { cwd: path.join(repoRoot, vendor.path) });
	return branch;
}

const reports = [];

for (const vendor of vendors) {
	assertClean(vendor);
	if (checkRemote) reports.push(vendorReport(vendor));
}

if (update) {
	for (const vendor of reports) {
		const branch = updateVendor(vendor);
		console.log(`${vendor.name}: checked out origin/${branch}`);
	}
	console.log("Review the vendor diff, run contract tests, then commit the intentional bump.");
	process.exit(0);
}

if (reports.length === 0) {
	console.log("Contract vendors are clean and pinned.");
	process.exit(0);
}

let outdatedCount = 0;
for (const report of reports) {
	const state = report.outdated ? "outdated" : "current";
	if (report.outdated) outdatedCount += 1;
	console.log(
		`${report.name}: ${state} (current ${report.current.slice(0, 12)}, origin/${report.branch} ${report.latest.slice(0, 12)})`,
	);
}

if (outdatedCount > 0 && failOnOutdated) {
	process.exitCode = 1;
}
