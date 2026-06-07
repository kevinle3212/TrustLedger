"use client";

import { createContext, use, useMemo, useState } from "react";

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
	const [role, setRoleState] = useState<Role>(() => {
		if (typeof window === "undefined") return "freelancer";
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === "client" || stored === "freelancer" ? stored : "freelancer";
	});

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
