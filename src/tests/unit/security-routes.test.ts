import type { AccountSession } from "@/services/offchainAccounts";
import type { NextRequest } from "next/server";

interface TestResponse {
	readonly status: number;
	readonly headers: {
		readonly get: (name: string) => string | null;
		readonly set: (name: string, value: string) => void;
	};
	readonly json: () => Promise<unknown>;
}

function jsonResponse(body: unknown, init?: ResponseInit): TestResponse {
	const headers = new Map<string, string>();
	return {
		status: init?.status ?? 200,
		headers: {
			get: (name): string | null => headers.get(name.toLowerCase()) ?? null,
			set: (name, value): void => {
				headers.set(name.toLowerCase(), value);
			},
		},
		json: async (): Promise<unknown> => await Promise.resolve(body),
	};
}

jest.mock("next/server", () => ({
	NextResponse: {
		json: (body: unknown, init?: ResponseInit): TestResponse => jsonResponse(body, init),
	},
}));

jest.mock("@/services/accountRequest", () => ({
	sessionFromRequest: jest.fn(),
}));

jest.mock("@/lib/ipfs", () => ({
	uploadToPinata: jest.fn(),
}));

jest.mock("@/services/offchainAccounts", () => ({
	createAccountChallenge: jest.fn(),
}));

jest.mock("@/security/accountRateLimit", () => ({
	ACCOUNT_SECURITY_RETRY_AFTER_SECONDS: 60,
	isAccountSecurityRateLimited: jest.fn(),
}));

const accountRequestMock: {
	readonly sessionFromRequest: jest.Mock;
} = jest.requireMock("@/services/accountRequest");
const ipfsMock: {
	readonly uploadToPinata: jest.Mock;
} = jest.requireMock("@/lib/ipfs");
const offchainAccountsMock: {
	readonly createAccountChallenge: jest.Mock;
} = jest.requireMock("@/services/offchainAccounts");
const accountRateLimitMock: {
	readonly isAccountSecurityRateLimited: jest.Mock;
} = jest.requireMock("@/security/accountRateLimit");

const { sessionFromRequest } = accountRequestMock;
const { uploadToPinata } = ipfsMock;
const { createAccountChallenge } = offchainAccountsMock;
const { isAccountSecurityRateLimited } = accountRateLimitMock;

function jsonRequest(body: unknown): Request {
	return {
		json: async (): Promise<unknown> => await Promise.resolve(body),
	} as Request;
}

function uploadRequest(
	file = new File(["hello"], "contract.txt", { type: "text/plain" }),
): Request {
	const formData = new FormData();
	formData.append("file", file);
	return {
		formData: async (): Promise<FormData> => await Promise.resolve(formData),
		headers: new Headers(),
	} as Request;
}

describe("security-sensitive API routes", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("requires an account session before proxying IPFS pinning", async () => {
		sessionFromRequest.mockReturnValue(null);
		const { POST } = await import("@/app/api/ipfs/pin/route");

		const response = await POST(uploadRequest() as NextRequest);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
		expect(uploadToPinata).not.toHaveBeenCalled();
	});

	it("pins IPFS uploads for authenticated account sessions", async () => {
		sessionFromRequest.mockReturnValue({
			walletAddress: "0x1111111111111111111111111111111111111111",
			issuedAt: 1,
			expiresAt: Date.now() + 60_000,
		} satisfies AccountSession);
		uploadToPinata.mockResolvedValue("ipfs://bafybeictest");
		const { POST } = await import("@/app/api/ipfs/pin/route");

		const response = await POST(uploadRequest() as NextRequest);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ uri: "ipfs://bafybeictest" });
		expect(uploadToPinata).toHaveBeenCalledWith(expect.any(File), "contract.txt");
	});

	it("rate limits account challenge issuance", async () => {
		isAccountSecurityRateLimited.mockReturnValue(true);
		const { POST } = await import("@/app/api/accounts/challenge/route");

		const response = await POST(
			jsonRequest({ address: "0x1111111111111111111111111111111111111111" }) as NextRequest,
		);

		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("60");
		await expect(response.json()).resolves.toEqual({
			error: "too many account verification attempts",
		});
		expect(createAccountChallenge).not.toHaveBeenCalled();
	});
});
