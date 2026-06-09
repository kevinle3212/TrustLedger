"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { useRole } from "@/contexts/RoleContext";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ContrastToggle } from "@/components/ContrastToggle";

/** GitHub mark SVG icon. */
function GitHubIcon(): React.JSX.Element {
	return (
		<svg
			role="img"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			fill="currentColor"
			width="18"
			height="18"
			aria-hidden="true"
		>
			<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
		</svg>
	);
}

/** Pill toggle that switches between client and freelancer mode. */
function RoleToggle(): React.JSX.Element {
	const { role, setRole } = useRole();
	const t = useTranslations("Nav");
	return (
		<fieldset className="grid min-w-0 grid-cols-2 rounded-full border border-gray-200 p-0.5 text-xs font-medium dark:border-white/10 sm:inline-grid sm:w-auto sm:shrink-0">
			<legend className="sr-only">{t("activeRole")}</legend>
			<button
				type="button"
				aria-pressed={role === "client"}
				onClick={() => {
					setRole("client");
				}}
				className={`tl-button-motion min-h-10 min-w-0 rounded-full px-2 py-1 text-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 sm:min-h-9 sm:px-3 ${
					role === "client"
						? "bg-indigo-600 text-white"
						: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				}`}
			>
				{t("roleClient")}
			</button>
			<button
				type="button"
				aria-pressed={role === "freelancer"}
				onClick={() => {
					setRole("freelancer");
				}}
				className={`tl-button-motion min-h-10 min-w-0 rounded-full px-2 py-1 text-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 sm:min-h-9 sm:px-3 ${
					role === "freelancer"
						? "bg-indigo-600 text-white"
						: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				}`}
			>
				{t("roleFreelancer")}
			</button>
		</fieldset>
	);
}

export function Navbar(): React.JSX.Element {
	const path = usePathname();
	const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL;
	const t = useTranslations("Nav");

	const linkClass = (href: string): string =>
		`tl-link-underline inline-flex min-h-10 shrink-0 items-center rounded-sm px-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:min-h-9 ${
			path === href
				? "text-gray-900 dark:text-white"
				: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
		}`;

	return (
		<header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-gray-950/90">
			<div className="tl-site-frame grid gap-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)] lg:min-h-16 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:py-0">
				<Link
					href="/"
					aria-current={path === "/" ? "page" : undefined}
					className="tl-button-motion flex min-h-11 w-fit shrink-0 items-center gap-2.5 rounded-sm text-lg font-bold tracking-tight text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-400 sm:text-xl"
				>
					<Image
						src="/trustledger-mark.svg"
						alt={t("logoAlt")}
						width={44}
						height={44}
						className="size-10 sm:size-11"
						style={{ height: "auto" }}
					/>
					TrustLedger
				</Link>
				<nav
					aria-label={t("mainNav")}
					className="tl-nav-scroller order-3 -mx-1 flex max-w-full items-center gap-x-4 overflow-x-auto px-1 pb-1 sm:col-span-2 sm:gap-x-6 lg:order-none lg:col-span-1 lg:mx-0 lg:justify-center lg:px-0 lg:pb-0"
				>
					<Link
						href="/create"
						aria-current={path === "/create" ? "page" : undefined}
						className={linkClass("/create")}
					>
						{t("newContract")}
					</Link>
					<Link
						href="/dashboard"
						aria-current={path === "/dashboard" ? "page" : undefined}
						className={linkClass("/dashboard")}
					>
						{t("dashboard")}
					</Link>
					<Link
						href="/juror"
						aria-current={path === "/juror" ? "page" : undefined}
						className={linkClass("/juror")}
					>
						{t("juror")}
					</Link>
					<Link
						href="/reputation"
						aria-current={path === "/reputation" ? "page" : undefined}
						className={linkClass("/reputation")}
					>
						{t("reputation")}
					</Link>
					<Link
						href="/faq"
						aria-current={path === "/faq" ? "page" : undefined}
						className={linkClass("/faq")}
					>
						{t("faq")}
					</Link>
				</nav>
				<div className="tl-nav-scroller -mx-1 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-1 sm:justify-end lg:mx-0 lg:justify-end lg:px-0 lg:pb-0">
					<RoleToggle />
					{githubUrl !== undefined && githubUrl !== "" && (
						<a
							href={githubUrl}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={t("viewGitHub")}
							className="tl-button-motion hidden min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white sm:inline-flex"
						>
							<GitHubIcon />
						</a>
					)}
					<ContrastToggle />
					<ThemeToggle />
					<div className="shrink-0 [&>button]:max-w-full [&>div]:max-w-full">
						<ConnectButton compact />
					</div>
				</div>
			</div>
		</header>
	);
}
