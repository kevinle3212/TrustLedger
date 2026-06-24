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

/**
 * Whitelist of profile fields a client is allowed to patch, mapped from an
 * untrusted JSON body to a typed, validated patch. Unknown keys are dropped and
 * type-mismatched values are ignored.
 *
 * @param body - Arbitrary parsed JSON object from the request.
 * @returns A partial profile patch containing only valid, recognized fields.
 */
function parseProfilePatch(
	body: Record<string, unknown>,
): Parameters<typeof updateAccountProfile>[1] {
	return {
		...(typeof body["displayName"] === "string" ? { displayName: body["displayName"] } : {}),
		...(typeof body["avatarUrl"] === "string" ? { avatarUrl: body["avatarUrl"] } : {}),
		...(typeof body["email"] === "string" ? { email: body["email"] } : {}),
		...(typeof body["onboardingComplete"] === "boolean"
			? { onboardingComplete: body["onboardingComplete"] }
			: {}),
		...(typeof body["notificationsEnabled"] === "boolean"
			? { notificationsEnabled: body["notificationsEnabled"] }
			: {}),
	};
}

/**
 * Returns the off-chain profile for the wallet behind a bearer session.
 *
 * @param token - Bearer token extracted from the `Authorization` header, or
 *   `null` when absent.
 * @returns `200` with `{ profile }` for a valid session, or `401`
 *   `{ error: "unauthorized" }` when the session is missing or invalid.
 */
export function getProfile(token: string | null): ControllerResult<ProfileBody> {
	const session = verifyAccountSession(token);
	if (session === null) return fail("unauthorized", 401);
	return ok({ profile: getAccountProfile(session.walletAddress) });
}

/**
 * Applies a whitelisted patch to the off-chain profile for the wallet behind a
 * bearer session.
 *
 * @param token - Bearer token extracted from the `Authorization` header, or
 *   `null` when absent.
 * @param body - Parsed JSON request body; only recognized fields are applied.
 * @returns `200` with the updated `{ profile }` for a valid session, or `401`
 *   `{ error: "unauthorized" }` when the session is missing or invalid.
 */
export function patchProfile(
	token: string | null,
	body: Record<string, unknown>,
): ControllerResult<ProfileBody> {
	const session = verifyAccountSession(token);
	if (session === null) return fail("unauthorized", 401);
	const profile = updateAccountProfile(session.walletAddress, parseProfilePatch(body));
	return ok({ profile });
}
