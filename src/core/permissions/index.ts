/**
 * Role-based permissions.
 *
 * A small capability matrix maps each {@link Role} to the {@link Action}s it may
 * perform. Pure and synchronous so it can guard both UI affordances and API
 * handlers from one source of truth.
 */

import { PermissionError } from "@/core/errors";

export type Role = "guest" | "client" | "freelancer" | "juror" | "admin";

export type Action =
	| "contract:create"
	| "contract:view"
	| "stake:manage"
	| "dispute:vote"
	| "analytics:view"
	| "admin:access";

const MATRIX: Record<Role, readonly Action[]> = {
	guest: ["contract:view"],
	client: ["contract:view", "contract:create", "stake:manage", "analytics:view"],
	freelancer: ["contract:view", "stake:manage", "analytics:view"],
	juror: ["contract:view", "dispute:vote", "analytics:view"],
	admin: [
		"contract:view",
		"contract:create",
		"stake:manage",
		"dispute:vote",
		"analytics:view",
		"admin:access",
	],
};

/** Whether `role` may perform `action`. */
export function can(role: Role, action: Action): boolean {
	return MATRIX[role].includes(action);
}

/** Throw a {@link PermissionError} unless `role` may perform `action`. */
export function assertCan(role: Role, action: Action): void {
	if (!can(role, action)) {
		throw new PermissionError(`Role "${role}" may not perform "${action}"`, { role, action });
	}
}
