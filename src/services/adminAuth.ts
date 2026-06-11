import crypto from "node:crypto";
import { timingSafeEqualString } from "./bearerAuth";

interface AdminAccount {
	readonly email: string;
	readonly username: string;
	readonly passwordHash: string;
	readonly walletAddress?: string;
	readonly roles: readonly string[];
	readonly nonDeletable: boolean;
}

export interface AdminSession {
	readonly email: string;
	readonly username: string;
	readonly walletAddress?: string;
	readonly roles: readonly string[];
	readonly expiresAt: number;
}

const ADMIN_COOKIE_NAME = "tl_admin_session";
const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const DEFAULT_ITERATIONS = 310_000;
const SESSION_TTL_SECONDS = 60 * 30;

function parseCsv(value: string | undefined): string[] {
	return (
		value?.split(",").flatMap((part) => {
			const trimmed = part.trim();
			return trimmed === "" ? [] : [trimmed.toLowerCase()];
		}) ?? []
	);
}

function clientIp(headers: Headers): string {
	const forwardedFor = headers.get("x-forwarded-for");
	if (forwardedFor !== null && forwardedFor !== "") {
		return forwardedFor.split(",")[0]?.trim() ?? "";
	}
	return headers.get("x-real-ip") ?? "";
}

function isLoopbackIp(ip: string): boolean {
	return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

function sessionSecret(): string | undefined {
	return process.env["ADMIN_SESSION_SECRET"] ?? process.env["ADMIN_API_TOKEN"];
}

function hmac(value: string): string {
	const secret = sessionSecret();
	if (secret === undefined || secret === "") {
		throw new Error("ADMIN_SESSION_SECRET or ADMIN_API_TOKEN is required");
	}
	return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function normalizeWallet(walletAddress: string | undefined): string | undefined {
	const trimmed = walletAddress?.trim();
	return trimmed === undefined || trimmed === "" ? undefined : trimmed.toLowerCase();
}

function parseAccountsJson(): AdminAccount[] {
	const raw = process.env["ADMIN_ACCOUNTS_JSON"];
	if (raw === undefined || raw === "") return [];

	const parsed = JSON.parse(raw) as unknown;
	if (!Array.isArray(parsed)) throw new Error("ADMIN_ACCOUNTS_JSON must be an array");

	return parsed.map((account): AdminAccount => {
		if (typeof account !== "object" || account === null) {
			throw new Error("ADMIN_ACCOUNTS_JSON entries must be objects");
		}
		const record = account as Record<string, unknown>;
		const email =
			typeof record["email"] === "string" ? record["email"].trim().toLowerCase() : "";
		const username =
			typeof record["username"] === "string" ? record["username"].trim().toLowerCase() : "";
		const passwordHash =
			typeof record["passwordHash"] === "string" ? record["passwordHash"] : "";
		const roles = Array.isArray(record["roles"])
			? record["roles"].flatMap((role) => (typeof role === "string" ? [role] : []))
			: ["admin"];
		if (email === "" || username === "" || passwordHash === "") {
			throw new Error("admin accounts require email, username, and passwordHash");
		}
		const walletAddress = normalizeWallet(
			typeof record["walletAddress"] === "string" ? record["walletAddress"] : undefined,
		);
		return {
			email,
			username,
			passwordHash,
			...(walletAddress === undefined ? {} : { walletAddress }),
			roles,
			nonDeletable: record["nonDeletable"] === true,
		};
	});
}

function bootstrapAccount(): AdminAccount | undefined {
	const passwordHash = process.env["ADMIN_BOOTSTRAP_PASSWORD_HASH"];
	if (passwordHash === undefined || passwordHash === "") return undefined;
	const email = process.env["ADMIN_BOOTSTRAP_EMAIL"]?.trim().toLowerCase();
	const username = process.env["ADMIN_BOOTSTRAP_USERNAME"]?.trim().toLowerCase();
	if (email === undefined || email === "" || username === undefined || username === "") {
		throw new Error(
			"ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_USERNAME are required when ADMIN_BOOTSTRAP_PASSWORD_HASH is set",
		);
	}
	const walletAddress = normalizeWallet(process.env["ADMIN_BOOTSTRAP_WALLET_ADDRESS"]);

	return {
		email,
		username,
		passwordHash,
		...(walletAddress === undefined ? {} : { walletAddress }),
		roles: ["owner", "admin", "operator"],
		nonDeletable: true,
	};
}

function loadAdminAccounts(): AdminAccount[] {
	const bootstrap = bootstrapAccount();
	const accounts = parseAccountsJson();
	return bootstrap === undefined ? accounts : [bootstrap, ...accounts];
}

function verifyAdminPassword(password: string, encodedHash: string): boolean {
	const [algorithm, iterationsRaw, salt, expected] = encodedHash.split("$");
	if (
		algorithm !== PASSWORD_ALGORITHM ||
		iterationsRaw === undefined ||
		salt === undefined ||
		expected === undefined
	) {
		return false;
	}
	const iterations = Number(iterationsRaw);
	if (!Number.isSafeInteger(iterations) || iterations < DEFAULT_ITERATIONS) return false;
	const actual = crypto
		.pbkdf2Sync(password, salt, iterations, 32, "sha256")
		.toString("base64url");
	return timingSafeEqualString(actual, expected);
}

export function isAdminIpAllowed(headers: Headers): boolean {
	const allowedIps = parseCsv(process.env["ADMIN_ALLOWED_IPS"]);
	if (allowedIps.length === 0) return true;
	const ip = clientIp(headers).toLowerCase();
	return allowedIps.includes(ip) || (process.env.NODE_ENV !== "production" && isLoopbackIp(ip));
}

function isWalletAllowed(walletAddress: string | undefined): boolean {
	const allowedWallets = parseCsv(process.env["ADMIN_WALLET_ADDRESSES"]);
	if (allowedWallets.length === 0) return true;
	const normalized = normalizeWallet(walletAddress);
	return normalized !== undefined && allowedWallets.includes(normalized);
}

export function authenticateAdminCredentials(input: {
	readonly usernameOrEmail: string;
	readonly password: string;
	readonly walletAddress?: string;
}): AdminSession | undefined {
	const subject = input.usernameOrEmail.trim().toLowerCase();
	const walletAddress = normalizeWallet(input.walletAddress);
	const account = loadAdminAccounts().find(
		(candidate) => candidate.email === subject || candidate.username === subject,
	);
	if (account === undefined) return undefined;
	if (!isWalletAllowed(walletAddress ?? account.walletAddress)) return undefined;
	if (account.walletAddress !== undefined && walletAddress !== account.walletAddress)
		return undefined;
	if (!verifyAdminPassword(input.password, account.passwordHash)) return undefined;

	const resolvedWalletAddress = walletAddress ?? account.walletAddress;
	return {
		email: account.email,
		username: account.username,
		...(resolvedWalletAddress === undefined ? {} : { walletAddress: resolvedWalletAddress }),
		roles: account.roles,
		expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
	};
}

function signAdminSession(session: AdminSession): string {
	const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
	return `${payload}.${hmac(payload)}`;
}

function verifyAdminSessionToken(token: string | undefined): AdminSession | undefined {
	if (token === undefined || token === "") return undefined;
	const dot = token.lastIndexOf(".");
	if (dot === -1) return undefined;
	const payload = token.slice(0, dot);
	const signature = token.slice(dot + 1);
	if (!timingSafeEqualString(hmac(payload), signature)) return undefined;

	const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
	if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return undefined;
	return parsed;
}

export function adminCookieHeader(session: AdminSession): string {
	return [
		`${ADMIN_COOKIE_NAME}=${signAdminSession(session)}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Max-Age=1800",
		process.env.NODE_ENV === "production" ? "Secure" : "",
	]
		.filter(Boolean)
		.join("; ");
}

export function expiredAdminCookieHeader(): string {
	return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function adminSessionFromHeaders(headers: Headers): AdminSession | undefined {
	const token = process.env["ADMIN_API_TOKEN"];
	const authorization = headers.get("authorization");
	if (token !== undefined && token !== "" && authorization === `Bearer ${token}`) {
		const walletAddress = normalizeWallet(headers.get("x-admin-wallet") ?? undefined);
		return {
			email: "token-admin@trustledger.local",
			username: "token-admin",
			roles: ["admin", "operator"],
			...(walletAddress === undefined ? {} : { walletAddress }),
			expiresAt: Math.floor(Date.now() / 1000) + 60,
		};
	}

	const cookieHeader = headers.get("cookie") ?? "";
	const sessionCookie = cookieHeader
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`));
	return verifyAdminSessionToken(sessionCookie?.slice(ADMIN_COOKIE_NAME.length + 1));
}

export function isAuthorizedAdminRequest(headers: Headers): boolean {
	return isAdminIpAllowed(headers) && adminSessionFromHeaders(headers) !== undefined;
}
