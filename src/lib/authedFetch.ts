"use client";

/**
 * Performs a `fetch` with the bearer session token attached as the
 * `Authorization` header, preserving any other headers passed in `init`.
 *
 * @param token - The bearer session token from {@link useAccountSession}.
 * @param input - The request URL.
 * @param init - Standard `fetch` options (headers are merged, not replaced).
 */
export async function authedFetch(
	token: string,
	input: string,
	init: RequestInit = {},
): Promise<Response> {
	const headers = new Headers(init.headers);
	headers.set("authorization", `Bearer ${token}`);
	return await fetch(input, { ...init, headers });
}
