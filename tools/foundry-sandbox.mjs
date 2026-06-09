import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
	console.error(`Usage: node tools/foundry-sandbox.mjs <forge-args...>

Runs forge from contracts/ with proxy-related environment stripped so sandboxed
macOS sessions do not trigger system proxy access panics. Live fork tests are
skipped unless TRUSTLEDGER_ALLOW_FORK_RPC=1 is set.

Examples:
  node tools/foundry-sandbox.mjs test --offline --no-match-path 'test/fork/**'
  TRUSTLEDGER_ALLOW_FORK_RPC=1 node tools/foundry-sandbox.mjs test --match-path 'test/fork/**'`);
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

const isForkTest = args.some((arg, index) => {
	const next = args[index + 1] ?? "";
	const previous = args[index - 1] ?? "";

	if (arg === "--no-match-path" && next.includes("test/fork")) {
		return false;
	}
	if (arg === "--match-path" && next.includes("test/fork")) {
		return true;
	}
	if (
		(arg === "--match-contract" || arg === "--match-test") &&
		next.toLowerCase().includes("fork")
	) {
		return true;
	}
	return arg.includes("test/fork") && previous !== "--no-match-path";
});

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
