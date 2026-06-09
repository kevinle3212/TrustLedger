import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const targets = {
	"darwin-arm64": {
		platform: "macos_aarch64_24.0.0",
		packageName: "@next/swc-darwin-arm64",
		binary: "next-swc.darwin-arm64.node",
	},
	"darwin-x64": {
		platform: "macos_x64_24.0.0",
		packageName: "@next/swc-darwin-x64",
		binary: "next-swc.darwin-x64.node",
	},
	"linux-arm64": {
		platform: "linux_arm64",
		packageName: "@next/swc-linux-arm64-gnu",
		binary: "next-swc.linux-arm64-gnu.node",
	},
	"linux-x64": {
		platform: "linux_x64",
		packageName: "@next/swc-linux-x64-gnu",
		binary: "next-swc.linux-x64-gnu.node",
	},
};

const target = targets[`${process.platform}-${process.arch}`];

if (target === undefined) {
	console.warn(`No SWC cache target configured for ${process.platform}-${process.arch}.`);
	process.exit(0);
}

const source = path.join(repoRoot, "src", "node_modules", target.packageName, target.binary);

if (!existsSync(source)) {
	console.warn(`SWC binary not found at ${path.relative(repoRoot, source)}.`);
	console.warn("Run npm install in src/ before building if this is a fresh checkout.");
	process.exit(0);
}

const cacheDir = path.join(repoRoot, "src", ".swc", "plugins", target.platform);
const destination = path.join(cacheDir, target.binary);
const manifestPath = path.join(cacheDir, "manifest.json");
const readmePath = path.join(cacheDir, "README.md");

mkdirSync(cacheDir, { recursive: true });
copyFileSync(source, destination);

const sha256 = createHash("sha256").update(readFileSync(destination)).digest("hex");
const manifest = {
	platform: target.platform,
	sourcePackage: target.packageName,
	binary: target.binary,
	sha256,
	committedBinary: false,
	repopulateCommand: `npm run swc:populate`,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);

if (!existsSync(readmePath)) {
	writeFileSync(
		readmePath,
		`# ${target.platform} SWC Plugin Cache\n\nThis directory is seeded locally from \`src/node_modules/${target.packageName}\`.\nThe native \`.node\` binary is dependency material and remains ignored.\n\nRepopulate with \`npm run swc:populate\`.\n`,
	);
}

console.log(`SWC cache populated: ${path.relative(repoRoot, destination)}`);
