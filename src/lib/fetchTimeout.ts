export const REQUEST_TIMEOUT_MS = {
	accountPreference: 4_000,
	aiSummary: 12_000,
	collaboration: 5_000,
	emailProvider: 10_000,
	githubAnalytics: 8_000,
	ipfsUpload: 45_000,
	oracle: 6_000,
	rpcRead: 10_000,
} as const;

function timeoutSignal(timeoutMs: number, reason = "Request timed out."): AbortSignal {
	const controller = new AbortController();
	const timer = setTimeout(() => {
		controller.abort(new DOMException(reason, "TimeoutError"));
	}, timeoutMs);
	controller.signal.addEventListener(
		"abort",
		() => {
			clearTimeout(timer);
		},
		{ once: true },
	);
	return controller.signal;
}

function mergeAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
	const activeSignals = signals.filter((signal): signal is AbortSignal => signal !== undefined);
	if (activeSignals.length === 0) return undefined;
	if (activeSignals.length === 1) return activeSignals[0];

	const controller = new AbortController();
	for (const signal of activeSignals) {
		if (signal.aborted) {
			controller.abort(signal.reason);
			return controller.signal;
		}
		signal.addEventListener(
			"abort",
			() => {
				controller.abort(signal.reason);
			},
			{ once: true },
		);
	}
	return controller.signal;
}

export async function fetchWithTimeout(
	input: RequestInfo | URL,
	init: RequestInit = {},
	timeoutMs: number = REQUEST_TIMEOUT_MS.rpcRead,
): Promise<Response> {
	const signal = mergeAbortSignals(init.signal ?? undefined, timeoutSignal(timeoutMs));
	const nextInit: RequestInit = { ...init };
	if (signal !== undefined) {
		nextInit.signal = signal;
	}
	return await fetch(input, nextInit);
}
