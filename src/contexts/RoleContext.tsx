"use client";

import { createContext, useContext, useState } from "react";

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

	function setRole(r: Role): void {
		setRoleState(r);
		localStorage.setItem(STORAGE_KEY, r);
	}

	return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): { role: Role; setRole: (r: Role) => void } {
	return useContext(RoleContext);
}
