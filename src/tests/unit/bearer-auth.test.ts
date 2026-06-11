import { isAuthorizedBearer, timingSafeEqualString } from "@/services/bearerAuth";

describe("bearer auth helpers", () => {
	it("accepts only exact bearer tokens with constant-time comparison", () => {
		expect(isAuthorizedBearer("Bearer secret-token", "secret-token")).toBe(true);
		expect(isAuthorizedBearer("Bearer wrong-token", "secret-token")).toBe(false);
		expect(isAuthorizedBearer("Basic secret-token", "secret-token")).toBe(false);
		expect(isAuthorizedBearer(null, "secret-token")).toBe(false);
		expect(isAuthorizedBearer("Bearer secret-token", "")).toBe(false);
	});

	it("rejects strings with different lengths before timing-safe comparison", () => {
		expect(timingSafeEqualString("abc", "abc")).toBe(true);
		expect(timingSafeEqualString("abc", "abcd")).toBe(false);
		expect(timingSafeEqualString("abc", "abd")).toBe(false);
	});
});
