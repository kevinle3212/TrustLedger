import { fireEvent, render, screen } from "@testing-library/react";

import { MobileNavMenu } from "@/components/MobileNavMenu";
import { NAV_LINKS } from "@/components/nav-links";
import { RowActionMenu } from "@/components/RowActionMenu";

// usePathname is not part of the global @/i18n/navigation mock (only Link is),
// so override the module here to add it. Link stays a plain anchor.
jest.mock("@/i18n/navigation", () => {
	const Link = ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}): React.JSX.Element => (
		<a href={href} {...props}>
			{children}
		</a>
	);
	return { Link, usePathname: (): string => "/" };
});

describe("RowActionMenu", () => {
	it("renders nothing when no actions are supplied", () => {
		const { container } = render(
			<RowActionMenu label="Contract Actions">{null}</RowActionMenu>,
		);
		expect(container).toBeEmptyDOMElement();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("renders the panel in a body portal with fixed positioning so row overflow cannot clip it", () => {
		render(
			<RowActionMenu label="Contract Actions">
				<button type="button">Release</button>
			</RowActionMenu>,
		);

		const panel = screen.getByRole("button", { name: "Release" }).closest("[id]");
		expect(panel).not.toBeNull();
		// createPortal mounts the panel as a direct child of document.body, escaping
		// the surrounding card/list overflow container.
		expect(panel?.parentElement).toBe(document.body);
		expect((panel as HTMLElement).style.position).toBe("fixed");
	});

	it("toggles the disclosure open and closed from the kebab trigger", () => {
		render(
			<RowActionMenu label="Contract Actions">
				<button type="button">Release</button>
			</RowActionMenu>,
		);

		const trigger = screen.getByRole("button", { name: "Contract Actions" });
		const panelId = trigger.getAttribute("aria-controls") ?? "";
		const panel = document.getElementById(panelId);
		expect(panel).not.toBeNull();

		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveAttribute("aria-haspopup", "true");
		expect(panelId).not.toBe("");
		expect(panel).toHaveClass("opacity-0");

		fireEvent.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(panel).toHaveClass("opacity-100");

		fireEvent.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(panel).toHaveClass("opacity-0");
	});
});

describe("MobileNavMenu", () => {
	it("renders the navigation menu in a body portal with fixed positioning", () => {
		render(<MobileNavMenu />);

		const menu = screen.getByRole("menu", { name: "mainNav" });
		expect(menu.parentElement).toBe(document.body);
		expect(menu.style.position).toBe("fixed");
	});

	it("lists every shared NAV_LINKS entry as a menu item with its href", () => {
		render(<MobileNavMenu />);

		for (const link of NAV_LINKS) {
			expect(screen.getByRole("menuitem", { name: link.labelKey })).toHaveAttribute(
				"href",
				link.href,
			);
		}
	});

	it("toggles open from the hamburger trigger", () => {
		render(<MobileNavMenu />);

		const trigger = screen.getByRole("button", { name: "openMenu" });
		const menu = screen.getByRole("menu", { name: "mainNav" });

		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(menu).toHaveClass("opacity-0");

		fireEvent.click(trigger);
		expect(menu).toHaveClass("opacity-100");
		// The accessible name flips to the close affordance once open.
		expect(screen.getByRole("button", { name: "closeMenu" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});
});
