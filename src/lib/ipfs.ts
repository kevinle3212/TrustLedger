// Upload a file to IPFS via Pinata's pinning API.
// jwt: Pinata API JWT (set NEXT_PUBLIC_PINATA_JWT in .env.local or pass at runtime).
// Returns an "ipfs://<CID>" URI suitable for storing on-chain.
import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from "@/lib/fetchTimeout";

export async function uploadToPinata(
	file: File | Blob,
	name: string,
	jwt: string,
): Promise<string> {
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
