/** A primary navigation entry. `labelKey` resolves against the `Nav` namespace. */
export interface NavLink {
	readonly href: string;
	readonly labelKey: string;
}

/**
 * Primary navigation links, shared between the desktop inline nav (`Navbar`) and
 * the mobile disclosure menu (`MobileNavMenu`) so the two can never drift.
 */
export const NAV_LINKS: readonly NavLink[] = [
	{ href: "/create", labelKey: "newContract" },
	{ href: "/dashboard", labelKey: "dashboard" },
	{ href: "/juror", labelKey: "juror" },
	{ href: "/reputation", labelKey: "reputation" },
	{ href: "/faq", labelKey: "faq" },
];
