import "server-only";

import {
	type AccountProfile,
	getAccountProfile,
	updateAccountProfile,
	verifyAccountSession,
} from "@/services/offchainAccounts";
import { type ControllerResult, fail, ok } from "./result";

/** Success body shape for both profile endpoints. */
interface ProfileBody {
	readonly profile: AccountProfile | null;
}

/** Inactivity auto-logout bounds: 1 minute … 24 hours, in milliseconds. */
const MIN_INACTIVITY_MS = 60_000;
const MAX_INACTIVITY_MS = 86_400_000;

/** Mutable shape of a validated profile patch before it is applied. */
type ProfilePatch = Parameters<typeof updateAccountProfile>[1];

/**
 * Validates and whitelists profile fields a client may patch. Unknown keys are
 * ignored; present-but-invalid values are rejected so the caller can return a
 * `400` rather than silently dropping them.
 *
 * @param body - Arbitrary parsed JSON object from the request.
 * @returns `{ patch }` with only valid, recognized fields, or `{ error }` with a
 *   machine-readable code when a provided field fails validation.
 */
function validateProfilePatch(
	body: Record<string, unknown>,
): { readonly patch: ProfilePatch } | { readonly error: string } {
	const patch: {
		displayName?: string;
		avatarUrl?: string;
		email?: string;
		onboardingComplete?: boolean;
		notificationsEnabled?: boolean;
		inactivityTimeoutMs?: number | null;
	} = {};

	const displayName = body["displayName"];
	if (displayName !== undefined) {
		if (typeof displayName !== "string" || displayName.length > 80)
			return { error: "invalid displayName" };
		patch.displayName = displayName;
	}

	const avatarUrl = body["avatarUrl"];
	if (avatarUrl !== undefined) {
		if (typeof avatarUrl !== "string" || avatarUrl.length > 300)
			return { error: "invalid avatarUrl" };
		patch.avatarUrl = avatarUrl;
	}

	const email = body["email"];
	if (email !== undefined) {
		if (typeof email !== "string" || email.length > 254) return { error: "invalid email" };
		patch.email = email;
	}

	const onboardingComplete = body["onboardingComplete"];
	if (onboardingComplete !== undefined) {
		if (typeof onboardingComplete !== "boolean") return { error: "invalid onboardingComplete" };
		patch.onboardingComplete = onboardingComplete;
	}

	const notificationsEnabled = body["notificationsEnabled"];
	if (notificationsEnabled !== undefined) {
		if (typeof notificationsEnabled !== "boolean")
			return { error: "invalid notificationsEnabled" };
		patch.notificationsEnabled = notificationsEnabled;
	}

	const timeout = body["inactivityTimeoutMs"];
	if (timeout !== undefined) {
		if (
			timeout !== null &&
			(typeof timeout !== "number" ||
				!Number.isInteger(timeout) ||
				timeout < MIN_INACTIVITY_MS ||
				timeout > MAX_INACTIVITY_MS)
		)
			return { error: "invalid inactivityTimeoutMs" };
		patch.inactivityTimeoutMs = timeout;
	}

	return { patch };
}

/**
 * Returns the off-chain profile for the wallet behind a bearer session.
 *
 * @param token - Bearer token extracted from the `Authorization` header, or
 *   `null` when absent.
 * @returns `200` with `{ profile }` for a valid session, or `401`
 *   `{ error: "unauthorized" }` when the session is missing or invalid.
 */
export async function getProfile(token: string | null): Promise<ControllerResult<ProfileBody>> {
	const session = verifyAccountSession(token);
	if (session === null) return fail("unauthorized", 401);
	return ok({ profile: await getAccountProfile(session.walletAddress) });
}

/**
 * Applies a whitelisted patch to the off-chain profile for the wallet behind a
 * bearer session.
 *
 * @param token - Bearer token extracted from the `Authorization` header, or
 *   `null` when absent.
 * @param body - Parsed JSON request body; only recognized fields are applied.
 * @returns `200` with the updated `{ profile }` for a valid session, `400`
 *   `{ error }` when a provided field is invalid, or `401`
 *   `{ error: "unauthorized" }` when the session is missing or invalid.
 */
export async function patchProfile(
	token: string | null,
	body: Record<string, unknown>,
): Promise<ControllerResult<ProfileBody>> {
	const session = verifyAccountSession(token);
	if (session === null) return fail("unauthorized", 401);
	const validated = validateProfilePatch(body);
	if ("error" in validated) return fail(validated.error, 400);
	const profile = await updateAccountProfile(session.walletAddress, validated.patch);
	return ok({ profile });
}
