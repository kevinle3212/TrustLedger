function parseCsv(value: string | undefined): string[] {
	return (
		value?.split(",").flatMap((part) => {
			const trimmed = part.trim();
			return trimmed === "" ? [] : [trimmed];
		}) ?? []
	);
}

function clientIp(request: Pick<Request, "headers">): string {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor !== null && forwardedFor !== "") {
		return forwardedFor.split(",")[0]?.trim() ?? "";
	}
	return request.headers.get("x-real-ip") ?? "";
}

function isLoopbackIp(ip: string): boolean {
	return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

export function isAuthorizedHealthRequest(request: Pick<Request, "headers">): boolean {
	const token = process.env["HEALTH_CHECK_TOKEN"] ?? process.env["ADMIN_API_TOKEN"];
	const authorization = request.headers.get("authorization");
	if (token !== undefined && token !== "" && authorization === `Bearer ${token}`) {
		return true;
	}

	const ip = clientIp(request);
	if (isLoopbackIp(ip)) return true;

	return parseCsv(process.env["HEALTH_CHECK_ALLOWED_IPS"]).includes(ip);
}
