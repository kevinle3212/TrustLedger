"use client";

import { createContext, startTransition, use, useEffect, useMemo, useState } from "react";

type Role = "client" | "freelancer";

const STORAGE_KEY = "trustledger_role";

function defaultSetRole(_r: Role): void {
	throw new Error("useRole must be called inside <RoleProvider>");
}

const RoleContext = createContext<{
	role: Role;
	setRole: (r: Role) => void;
}>({ role: "freelancer", setRole: defaultSetRole });

/** Persists the active role (client / freelancer) in localStorage. */
export function RoleProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
	// Start with the safe default on both server and client so SSR and hydration
	// produce identical markup (avoids React error #418). After hydration, the
	// effect below reads localStorage and updates to the stored value.
	const [role, setRoleState] = useState<Role>("freelancer");

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "client" || stored === "freelancer") {
			startTransition(() => {
				setRoleState(stored);
			});
		}
	}, []);

	const value = useMemo(() => {
		function setRole(r: Role): void {
			setRoleState(r);
			localStorage.setItem(STORAGE_KEY, r);
		}
		return { role, setRole };
	}, [role]);

	return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): { role: Role; setRole: (r: Role) => void } {
	return use(RoleContext);
}
