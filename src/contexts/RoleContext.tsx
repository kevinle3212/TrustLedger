"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Role = "client" | "freelancer";

const STORAGE_KEY = "trustledger_role";

const RoleContext = createContext<{
	role: Role;
	setRole: (r: Role) => void;
}>({ role: "freelancer", setRole: () => {} });

/** Persists the active role (client / freelancer) in localStorage. */
export function RoleProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
	const [role, setRoleState] = useState<Role>("freelancer");

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "client" || stored === "freelancer") {
			setRoleState(stored);
		}
	}, []);

	function setRole(r: Role): void {
		setRoleState(r);
		localStorage.setItem(STORAGE_KEY, r);
	}

	return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole(): { role: Role; setRole: (r: Role) => void } {
	return useContext(RoleContext);
}
