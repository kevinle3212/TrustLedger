import { NextResponse } from "next/server";

import { isAuthorizedAdminRequest } from "@/services/adminAuth";
import { buildAdminDashboardReport } from "@/services/adminReport";

export const dynamic = "force-dynamic";

export function GET(request: Request): NextResponse {
	if (!isAuthorizedAdminRequest(request.headers)) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	return NextResponse.json(buildAdminDashboardReport());
}
