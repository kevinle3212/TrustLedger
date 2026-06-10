#!/usr/bin/env node
import { mkdirSync, rmSync } from "node:fs";
import { arch, platform } from "node:process";
import { spawnSync } from "node:child_process";

const outDir = "tmp/native-check";

function run(command, args) {
	const result = spawnSync(command, args, { encoding: "utf8", stdio: "pipe" });
	if (result.status !== 0) {
		const stderr = result.stderr.trim();
		throw new Error(
			`${command} ${args.join(" ")} failed${stderr === "" ? "" : `:\n${stderr}`}`,
		);
	}
}

function has(command) {
	return spawnSync(command, ["--version"], { encoding: "utf8", stdio: "ignore" }).status === 0;
}

if (!has("clang") || !has("clang++")) {
	console.log("native:check skipped because clang and clang++ are not available.");
	process.exit(0);
}

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

run("clang", [
	"-std=c17",
	"-Wall",
	"-Wextra",
	"-Werror",
	"-I",
	"native/include",
	"-c",
	"native/c/tl_hash.c",
	"-o",
	`${outDir}/tl_hash.o`,
]);
run("clang++", [
	"-std=c++20",
	"-Wall",
	"-Wextra",
	"-Werror",
	"-I",
	"native/include",
	"-c",
	"native/cpp/tl_metrics.cpp",
	"-o",
	`${outDir}/tl_metrics.o`,
]);

const asmFile =
	arch === "arm64"
		? "native/asm/tl_mix64_arm64.S"
		: arch === "x64"
			? "native/asm/tl_mix64_x86_64.S"
			: null;

if (asmFile !== null && (platform === "darwin" || platform === "linux")) {
	run("clang", ["-c", asmFile, "-o", `${outDir}/tl_mix64.o`]);
	console.log(`native:check compiled C, C++, and ${arch} assembly.`);
} else {
	console.log(`native:check compiled C and C++; assembly skipped for ${platform}/${arch}.`);
}
