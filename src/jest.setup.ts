import "@testing-library/jest-dom";
import React from "react";
import { TextDecoder, TextEncoder } from "node:util";

globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
globalThis.TextEncoder = TextEncoder;

jest.mock("@/i18n/navigation", () => {
	const Link = ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}): React.JSX.Element => {
		return React.createElement("a", { href, ...props }, children);
	};
	return { Link };
});
