import { resetAiConfigCache, resetProviderCache } from "@/core/ai";
import { moderateMessage } from "@/services/moderation";

jest.mock("server-only", () => ({}), { virtual: true });

describe("moderation service", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// No AI_* provider config -> @/core/ai is disabled -> moderation fails open.
		process.env = { ...originalEnv };
		delete process.env.AI_PROVIDER_KIND;
		delete process.env.AI_BASE_URL;
		delete process.env.AI_API_KEY;
		delete process.env.AI_DEFAULT_MODEL;
		delete process.env.AI_ENABLED;
		resetAiConfigCache();
		resetProviderCache();
	});

	afterEach(() => {
		process.env = originalEnv;
		resetAiConfigCache();
		resetProviderCache();
	});

	it("fails open with allow when AI is disabled", async () => {
		const result = await moderateMessage("please pay me directly at attacker@example.com");
		expect(result.decision).toBe("allow");
		expect(result.categories).toEqual([]);
	});
});
