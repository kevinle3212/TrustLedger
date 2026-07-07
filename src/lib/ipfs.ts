import "server-only";

import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

/**
 * Uploads a document blob to IPFS via Pinata using the server-only JWT.
 *
 * @param file - Document bytes to pin.
 * @param name - Filename stored in Pinata metadata.
 * @returns An `ipfs://<CID>` URI suitable for storing on-chain.
 */
export async function uploadToPinata(file: File | Blob, name: string): Promise<string> {
	const jwt = process.env.PINATA_JWT;
	if (jwt === undefined || jwt === "") {
		throw new Error("PINATA_JWT is not configured.");
	}

	const body = new FormData();
	body.append("file", file, name);
	body.append("pinataMetadata", JSON.stringify({ name }));
	body.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

	const res = await fetchWithTimeout(
		"https://api.pinata.cloud/pinning/pinFileToIPFS",
		{
			method: "POST",
			headers: { Authorization: `Bearer ${jwt}` },
			body,
		},
		REQUEST_TIMEOUT_MS.ipfsUpload,
	);

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Pinata upload failed (${String(res.status)}): ${text}`);
	}

	const json = (await res.json()) as { IpfsHash: string };
	return `ipfs://${json.IpfsHash}`;
}
