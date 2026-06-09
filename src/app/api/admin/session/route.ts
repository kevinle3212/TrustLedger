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

export function DELETE(request: Request): NextResponse {
	const response = NextResponse.redirect(new URL("/en/admin/sign-in", request.url), {
		status: 303,
	});
	response.headers.set("Set-Cookie", expiredAdminCookieHeader());
	return response;
}
