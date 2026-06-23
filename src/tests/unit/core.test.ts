import {
	AnalyticsService,
	AppError,
	BufferSink,
	EventBus,
	NotFoundError,
	PermissionError,
	TTLCache,
	ValidationError,
	assertCan,
	can,
	clamp,
	clearFlagOverrides,
	isEnabled,
	isEvmAddress,
	memoizeAsync,
	normalizeError,
	setFlagOverride,
	truncateMiddle,
	validateAmount,
	type Clock,
} from "@/core";

describe("core/errors", () => {
	it("normalizes arbitrary throwables into AppError", () => {
		expect(normalizeError(new ValidationError("bad")).code).toBe("VALIDATION");
		expect(normalizeError(new Error("boom")).code).toBe("INTERNAL");
		expect(normalizeError("oops").message).toBe("oops");
		expect(normalizeError(new NotFoundError("missing")).toJSON()).toEqual({
			code: "NOT_FOUND",
			message: "missing",
			context: undefined,
		});
	});

	it("keeps the AppError prototype chain for instanceof checks", () => {
		const error = new PermissionError("nope");
		expect(error).toBeInstanceOf(AppError);
		expect(error).toBeInstanceOf(PermissionError);
	});
});

describe("core/permissions", () => {
	it("enforces the capability matrix", () => {
		expect(can("client", "contract:create")).toBe(true);
		expect(can("guest", "contract:create")).toBe(false);
		expect(can("admin", "admin:access")).toBe(true);
		expect(() => {
			assertCan("juror", "admin:access");
		}).toThrow(PermissionError);
	});
});

describe("core/flags", () => {
	afterEach(() => {
		clearFlagOverrides();
	});

	it("honors runtime overrides over defaults", () => {
		expect(isEnabled("stakingEnabled")).toBe(true);
		setFlagOverride("stakingEnabled", false);
		expect(isEnabled("stakingEnabled")).toBe(false);
	});
});

describe("core/validation", () => {
	it("validates token amounts against decimals", () => {
		expect(validateAmount("1.5", 9).ok).toBe(true);
		expect(validateAmount("", 9)).toMatchObject({ ok: false });
		expect(validateAmount("0", 9)).toMatchObject({ ok: false });
		expect(validateAmount("1.2345678901", 6)).toMatchObject({ ok: false });
		expect(validateAmount("abc", 9)).toMatchObject({ ok: false });
	});

	it("detects EVM addresses", () => {
		expect(isEvmAddress("0x0000000000000000000000000000000000000000")).toBe(true);
		expect(isEvmAddress("nope")).toBe(false);
	});
});

describe("core/cache", () => {
	it("expires entries by ttl using an injected clock", () => {
		let time = 0;
		const clock: Clock = { now: () => time };
		const cache = new TTLCache<number>(100, 500, clock);
		cache.set("a", 1);
		expect(cache.get("a")).toBe(1);
		time = 101;
		expect(cache.get("a")).toBeUndefined();
	});

	it("memoizes async calls and dedupes concurrent ones", async () => {
		let calls = 0;
		const fn = memoizeAsync(
			async (n: number) => {
				calls += 1;
				await Promise.resolve();
				return n * 2;
			},
			(n) => String(n),
			1_000,
		);
		const [a, b] = await Promise.all([fn(2), fn(2)]);
		expect(a).toBe(4);
		expect(b).toBe(4);
		expect(calls).toBe(1);
	});
});

describe("core/events + analytics", () => {
	it("fans tracked events to the sink and event bus", () => {
		const bus = new EventBus();
		const seen: string[] = [];
		bus.on("contract:created", (p) => seen.push(p.id));
		bus.emit("contract:created", { id: "x1", asset: "USDC" });
		bus.emit("contract:created", { id: "x2", asset: "SOL" });
		expect(seen).toEqual(["x1", "x2"]);

		const sink = new BufferSink();
		const service = new AnalyticsService(sink);
		service.track("page_view", { path: "/dashboard" });
		expect(sink.events).toHaveLength(1);
		expect(sink.events[0]?.name).toBe("page_view");
	});

	it("unsubscribes via the returned disposer", () => {
		const bus = new EventBus();
		let count = 0;
		const off = bus.on("wallet:disconnected", () => {
			count += 1;
		});
		bus.emit("wallet:disconnected", {});
		off();
		bus.emit("wallet:disconnected", {});
		expect(count).toBe(1);
	});
});

describe("core/utils", () => {
	it("clamps and truncates", () => {
		expect(clamp(5, 0, 3)).toBe(3);
		expect(clamp(-1, 0, 3)).toBe(0);
		expect(truncateMiddle("0x1234567890abcdef", 4, 4)).toBe("0x12…cdef");
	});
});
