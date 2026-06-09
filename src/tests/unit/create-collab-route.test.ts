import { ReadableStream } from "node:stream/web";
import type { GET as GetRoute, POST as PostRoute } from "@/app/api/create-collab/[roomId]/route";

const ROOM_ID = "room_111111111111";

interface RouteParams {
	readonly params: Promise<{ readonly roomId: string }>;
}

interface RouteModule {
	readonly GET: typeof GetRoute;
	readonly POST: typeof PostRoute;
}

async function installFetchPolyfill(): Promise<void> {
	Object.assign(globalThis, { ReadableStream });
	const { Headers, Request, Response } = await import("undici");
	Object.assign(globalThis, { Headers, Request, Response });
}

async function loadRoute(): Promise<RouteModule> {
	await installFetchPolyfill();
	return await import("@/app/api/create-collab/[roomId]/route");
}

function request(body?: unknown): Request {
	const init: RequestInit =
		body === undefined
			? { method: "GET" }
			: {
					method: "POST",
					body: JSON.stringify(body),
					headers: { "content-type": "application/json" },
				};
	return new Request(`http://localhost/api/create-collab/${ROOM_ID}`, init);
}

function params(roomId = ROOM_ID): RouteParams {
	return { params: Promise.resolve({ roomId }) };
}

describe("create collaboration relay", () => {
	it("stores and returns encrypted snapshots without plaintext draft fields", async () => {
		const { GET, POST } = await loadRoute();
		const encryptedDraft = "encrypted_snapshot_payload";
		const postResponse = await POST(
			request({
				eventId: "event_111111111111",
				encryptedDraft,
				authorWallet: "0x1111111111111111111111111111111111111111",
				updatedAt: "2026-06-09T12:00:00.000Z",
			}),
			params(),
		);

		expect(postResponse.status).toBe(200);
		const getResponse = await GET(request(), params());
		const body = (await getResponse.json()) as {
			readonly snapshot: {
				readonly eventId: string;
				readonly encryptedDraft: string;
				readonly authorWallet: string;
			};
		};

		expect(body.snapshot.eventId).toBe("event_111111111111");
		expect(body.snapshot.encryptedDraft).toBe(encryptedDraft);
		expect(JSON.stringify(body)).not.toContain("termsBody");
		expect(body.snapshot.authorWallet).toBe("0x1111111111111111111111111111111111111111");
	});

	it("rejects invalid rooms, authors, and oversized payloads", async () => {
		const { POST } = await loadRoute();
		await expect(POST(request({}), params("bad room"))).resolves.toHaveProperty("status", 400);
		await expect(
			POST(
				request({
					eventId: "event_222222222222",
					encryptedDraft: "payload",
					authorWallet: "not-a-wallet",
					updatedAt: "2026-06-09T12:00:00.000Z",
				}),
				params(),
			),
		).resolves.toHaveProperty("status", 400);
		await expect(
			POST(
				request({
					eventId: "event_333333333333",
					encryptedDraft: "x".repeat(96_001),
					authorWallet: null,
					updatedAt: "2026-06-09T12:00:00.000Z",
				}),
				params(),
			),
		).resolves.toHaveProperty("status", 400);
	});
});
