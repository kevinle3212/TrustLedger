import { isAuthorizedBearer } from "./bearerAuth";

function parseCsv(value: string | undefined): string[] {
	return (
		value?.split(",").flatMap((part) => {
			const trimmed = part.trim();
			return trimmed === "" ? [] : [trimmed];
		}) ?? []
	);
}

/**
 * Resolves the client IP from proxy headers, preferring the first
 * `x-forwarded-for` entry and falling back to `x-real-ip`.
 *
 * @param request - Request-like object exposing `headers`.
 * @returns The client IP string, or `""` when no header is present.
 */
function clientIp(request: Pick<Request, "headers">): string {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor !== null && forwardedFor !== "") {
		return forwardedFor.split(",")[0]?.trim() ?? "";
	}
	return request.headers.get("x-real-ip") ?? "";
}

/**
 * Reports whether an IP is an IPv4/IPv6 loopback address.
 *
 * @param ip - Resolved client IP.
 * @returns `true` for `127.0.0.1`, `::1`, or the IPv4-mapped loopback.
 */
function isLoopbackIp(ip: string): boolean {
	return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/**
 * Authorizes a request to a health/diagnostics endpoint.
 *
 * Access is granted when any of the following hold, in order:
 *
 * 1. The `Authorization` header matches `HEALTH_CHECK_TOKEN` (falling back to
 *    `ADMIN_API_TOKEN`) via a constant-time bearer check.
 * 2. The resolved client IP is loopback (local platform health probes).
 * 3. The client IP is listed in the `HEALTH_CHECK_ALLOWED_IPS` CSV allowlist.
 *
 * @param request - Request-like object exposing `headers` (used for the bearer
 *   token and `x-forwarded-for`/`x-real-ip` client IP resolution).
 * @returns `true` when the request is authorized to read health data.
 */
export function isAuthorizedHealthRequest(request: Pick<Request, "headers">): boolean {
	const token = process.env.HEALTH_CHECK_TOKEN ?? process.env.ADMIN_API_TOKEN;
	if (isAuthorizedBearer(request.headers.get("authorization"), token)) {
		return true;
	}

	const ip = clientIp(request);
	if (isLoopbackIp(ip)) return true;

	return parseCsv(process.env.HEALTH_CHECK_ALLOWED_IPS).includes(ip);
}
