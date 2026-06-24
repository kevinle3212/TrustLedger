import { NextResponse } from "next/server";

import {
	adminCookieHeader,
	authenticateAdminCredentials,
	expiredAdminCookieHeader,
	isAdminIpAllowed,
} from "@/services/adminAuth";

export const dynamic = "force-dynamic";

function formString(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === "string" ? value : "";
}

/**
 * `POST /api/admin/session` — admin sign-in. Validates credentials and sets a
 * signed, `HttpOnly` admin session cookie.
 *
 * - **Auth:** IP allowlist ({@link isAdminIpAllowed}) plus credential check.
 * - **Request:** `multipart/form-data` fields `usernameOrEmail`, `password`,
 *   and optional `walletAddress`.
 * - **Responses:**
 *   - `303` redirect to `/en/admin` with a `Set-Cookie` session on success.
 *   - `403` `{ error }` when the client IP is not allowed.
 *   - `401` `{ error }` for invalid credentials.
 *
 * @param request - Incoming form request.
 * @returns Redirect response with a session cookie, or an error.
 */
export async function POST(request: Request): Promise<NextResponse> {
	if (!isAdminIpAllowed(request.headers)) {
		return NextResponse.json({ error: "admin IP not allowed" }, { status: 403 });
	}

	const form = await request.formData();
	const usernameOrEmail = formString(form, "usernameOrEmail");
	const password = formString(form, "password");
	const walletAddress = formString(form, "walletAddress");
	const session = authenticateAdminCredentials({ usernameOrEmail, password, walletAddress });

	if (session === undefined) {
		return NextResponse.json({ error: "invalid admin credentials" }, { status: 401 });
	}

	const response = NextResponse.redirect(new URL("/en/admin", request.url), { status: 303 });
	response.headers.set("Set-Cookie", adminCookieHeader(session));
	return response;
}

/**
 * `DELETE /api/admin/session` — admin sign-out. Clears the session cookie.
 *
 * - **Auth:** none required (clearing is always safe).
 * - **Responses:** `303` redirect to `/en/admin/sign-in` with an expired
 *   session cookie.
 *
 * @param request - Incoming request (used for the redirect origin).
 * @returns Redirect response that expires the session cookie.
 */
export function DELETE(request: Request): NextResponse {
	const response = NextResponse.redirect(new URL("/en/admin/sign-in", request.url), {
		status: 303,
	});
	response.headers.set("Set-Cookie", expiredAdminCookieHeader());
	return response;
}
