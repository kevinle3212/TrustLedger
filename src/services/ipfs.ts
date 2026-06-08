// IPFS pinning via the Pinata REST API.
//
// All functions are server-only: they read PINATA_JWT at call time and must
// never be imported into a client component (doing so would leak the key into
// the browser bundle). Import these from API routes and other server modules.
//
// Pinata was chosen because it exposes a plain JSON REST API — no extra npm
// dependency is required beyond the global fetch already available in Node 18+.

/** Result of a pin or unpin operation. Discriminated on `ok`. */
export type PinResult = { ok: true; cid: string } | { ok: false; error: string };

/**
 * Build a public gateway URL for a given CID.
 *
 * Uses `PINATA_GATEWAY` from the environment when set; otherwise falls back
 * to the Pinata public gateway. Include no trailing slash in the env var.
 *
 * @example
 * const url = gatewayUrl("Qm...");
 * // → "https://gateway.pinata.cloud/ipfs/Qm..."
 */
export function gatewayUrl(cid: string): string {
	const base = process.env["PINATA_GATEWAY"] ?? "https://gateway.pinata.cloud/ipfs";
	return `${base.replace(/\/$/, "")}/${cid}`;
}

/**
 * Pin a JSON-serialisable value to IPFS via Pinata and return its CID.
 *
 * Reads `PINATA_JWT` from the environment; fails cleanly if unset.
 * Never throws: transport and config errors are returned as `{ ok: false, error }`.
 *
 * @param data  Any JSON-serialisable value (contract metadata, evidence, etc.).
 * @param name  Optional human label shown in the Pinata dashboard.
 *
 * @example
 * const res = await pinJson({ contractId: "42", notes: "Phase 1 delivered" });
 * if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
 * console.log("CID:", res.cid);
 */
export async function pinJson(data: unknown, name?: string): Promise<PinResult> {
	const jwt = process.env["PINATA_JWT"];
	if (jwt === undefined || jwt === "") {
		return { ok: false, error: "PINATA_JWT not set" };
	}

	try {
		const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${jwt}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				pinataContent: data,
				...(name !== undefined ? { pinataMetadata: { name } } : {}),
			}),
		});

		if (!res.ok) {
			const text = await res.text().catch(() => res.statusText);
			return { ok: false, error: `Pinata ${String(res.status)}: ${text}` };
		}

		const json = (await res.json()) as { IpfsHash: string };
		return { ok: true, cid: json.IpfsHash };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "IPFS pin failed",
		};
	}
}

/**
 * Pin a binary file to IPFS via Pinata and return its CID.
 *
 * Reads `PINATA_JWT` from the environment; fails cleanly if unset.
 * Never throws.
 *
 * @param content   Raw file bytes.
 * @param filename  Name used in the Pinata dashboard and multipart form.
 * @param mimeType  MIME type of the content (e.g. `"application/pdf"`).
 *
 * @example
 * const res = await pinFile(pdfBytes, "evidence.pdf", "application/pdf");
 */
export async function pinFile(
	content: Uint8Array<ArrayBuffer> | ArrayBuffer,
	filename: string,
	mimeType = "application/octet-stream",
): Promise<PinResult> {
	const jwt = process.env["PINATA_JWT"];
	if (jwt === undefined || jwt === "") {
		return { ok: false, error: "PINATA_JWT not set" };
	}

	try {
		const form = new FormData();
		form.append("file", new Blob([content], { type: mimeType }), filename);

		const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
			method: "POST",
			headers: { Authorization: `Bearer ${jwt}` },
			body: form,
		});

		if (!res.ok) {
			const text = await res.text().catch(() => res.statusText);
			return { ok: false, error: `Pinata ${String(res.status)}: ${text}` };
		}

		const json = (await res.json()) as { IpfsHash: string };
		return { ok: true, cid: json.IpfsHash };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "IPFS pin failed",
		};
	}
}

/**
 * Remove a CID from the Pinata pinset, making it eligible for garbage
 * collection on the public IPFS network over time.
 *
 * Never throws; returns `{ ok: false, error }` on failure.
 *
 * @example
 * await unpin("Qm...");
 */
export async function unpin(cid: string): Promise<{ ok: boolean; error?: string }> {
	const jwt = process.env["PINATA_JWT"];
	if (jwt === undefined || jwt === "") {
		return { ok: false, error: "PINATA_JWT not set" };
	}

	try {
		const res = await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${jwt}` },
		});

		if (!res.ok) {
			const text = await res.text().catch(() => res.statusText);
			return { ok: false, error: `Pinata ${String(res.status)}: ${text}` };
		}

		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : "IPFS unpin failed",
		};
	}
}
