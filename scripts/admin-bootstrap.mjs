#!/usr/bin/env node
import crypto from "node:crypto";

const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
if (password === undefined || password.length < 12) {
	console.error("Set ADMIN_BOOTSTRAP_PASSWORD to a password with at least 12 characters.");
	process.exit(1);
}

const email = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "kevinle3212@gmail.com").toLowerCase();
const username = (process.env.ADMIN_BOOTSTRAP_USERNAME ?? "kevinle").toLowerCase();
const walletAddress = process.env.ADMIN_BOOTSTRAP_WALLET_ADDRESS?.toLowerCase();
const salt = crypto.randomBytes(16).toString("base64url");
const iterations = 310_000;
const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
const passwordHash = ["pbkdf2_sha256", String(iterations), salt, hash].join("$");

console.log(
	JSON.stringify(
		{
			ADMIN_BOOTSTRAP_EMAIL: email,
			ADMIN_BOOTSTRAP_USERNAME: username,
			ADMIN_BOOTSTRAP_PASSWORD_HASH: passwordHash,
			...(walletAddress === undefined
				? {}
				: { ADMIN_BOOTSTRAP_WALLET_ADDRESS: walletAddress }),
			ADMIN_ACCOUNTS_JSON: [
				{
					email,
					username,
					passwordHash,
					walletAddress,
					roles: ["owner", "admin", "operator"],
					nonDeletable: true,
				},
			],
		},
		null,
		2,
	),
);
