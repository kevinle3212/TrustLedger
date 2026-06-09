import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.length === 0) {
	console.error("Usage: node tools/foundry-sandbox.mjs <forge-args...>");
	process.exit(2);
}

const env = { ...process.env };

for (const key of [
	"ALL_PROXY",
	"all_proxy",
	"ETHERSCAN_API_KEY",
	"ETHERSCAN_API_URL",
	"ETHERSCAN_CHAIN",
	"HTTP_PROXY",
	"http_proxy",
	"HTTPS_PROXY",
	"https_proxy",
]) {
	delete env[key];
}

env.NO_PROXY = "*";
env.no_proxy = "*";

const isForkTest = args.some((arg) => arg.includes("test/fork"));

if (isForkTest && env.TRUSTLEDGER_ALLOW_FORK_RPC !== "1") {
	console.warn(
		"Skipping live fork tests for sandbox-safe Foundry run. Set TRUSTLEDGER_ALLOW_FORK_RPC=1 to run them.",
	);
	process.exit(0);
}

const result = spawnSync("forge", args, {
	cwd: path.join(repoRoot, "contracts"),
	env,
	stdio: "inherit",
});

if (result.error !== undefined) {
	console.error(result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 1);
