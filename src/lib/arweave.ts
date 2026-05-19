"use client";

// Permanent-storage fallback: upload data to Arweave using a JWK wallet.
// The user provides their Arweave wallet JSON file; we sign and broadcast
// the transaction client-side so no private key ever leaves the browser.

import Arweave from "arweave";

const arweave = Arweave.init({
	host: "arweave.net",
	port: 443,
	protocol: "https",
});

// Shape of an Arweave JWK — the parsed contents of a wallet .json file.
export type ArweaveJWK = Parameters<typeof arweave.wallets.jwkToAddress>[0];

// Upload bytes to Arweave and return an "ar://<txId>" URI.
// contentType: MIME type stored as a tag on the transaction.
export async function uploadToArweave(
	data: Uint8Array,
	contentType: string,
	jwk: ArweaveJWK,
): Promise<string> {
	const tx = await arweave.createTransaction({ data }, jwk);
	tx.addTag("Content-Type", contentType);
	tx.addTag("App-Name", "TrustLedger");
	await arweave.transactions.sign(tx, jwk);

	const res = await arweave.transactions.post(tx);
	if (res.status !== 200 && res.status !== 202) {
		throw new Error(`Arweave upload failed (${String(res.status)}): ${res.statusText}`);
	}

	return `ar://${tx.id}`;
}

// Return the AR balance (in AR, not winston) for the wallet.
export async function getArweaveBalance(jwk: ArweaveJWK): Promise<string> {
	const address = await arweave.wallets.jwkToAddress(jwk);
	const winston = await arweave.wallets.getBalance(address);
	return arweave.ar.winstonToAr(winston);
}
