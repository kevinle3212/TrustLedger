"use client";

import { ConnectButton } from "@/components/ConnectButton";
import { useRole } from "@/contexts/RoleContext";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
/** Pill toggle that switches between client and freelancer mode. */
/** Pill toggle that switches between client and freelancer mode. */
function RoleToggle(): React.JSX.Element {
	const { role, setRole } = useRole();
	return (
		<fieldset className="flex items-center rounded-full border border-gray-200 dark:border-white/10 p-0.5 text-xs font-medium">
			<legend className="sr-only">Active role</legend>
			<button
				type="button"
				aria-pressed={role === "client"}
				onClick={() => {
					setRole("client");
				}}
				className={`px-3 py-1 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
					role === "client"
						? "bg-indigo-600 text-white"
						: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				}`}
			>
				Client
			</button>
			<button
				type="button"
				aria-pressed={role === "freelancer"}
				onClick={() => {
					setRole("freelancer");
				}}
				className={`px-3 py-1 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
					role === "freelancer"
						? "bg-indigo-600 text-white"
						: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				}`}
			>
				Freelancer
			</button>
		</fieldset>
	);
}

export function Navbar(): React.JSX.Element {
	const path = usePathname();
	const githubUrl = process.env["NEXT_PUBLIC_GITHUB_URL"];

	const linkClass = (href: string): string =>
		`text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 rounded-sm ${
			path === href
				? "text-gray-900 dark:text-white"
				: "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
		}`;

	return (
		<header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-gray-950/80 backdrop-blur sticky top-0 z-50">
			<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
				<div className="flex items-center gap-8">
					<Link
						href="/"
						aria-current={path === "/" ? "page" : undefined}
						className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 rounded-sm"
					>
						<Image
							src="/logo.png"
							alt="TrustLedger logo"
							width={28}
							height={28}
							className="rounded"
							style={{ height: "auto" }}
						/>
						TrustLedger
					</Link>
					<nav aria-label="Main navigation" className="flex items-center gap-6">
						<Link
							href="/create"
							aria-current={path === "/create" ? "page" : undefined}
							className={linkClass("/create")}
						>
							New Contract
						</Link>
						<Link
							href="/dashboard"
							aria-current={path === "/dashboard" ? "page" : undefined}
							className={linkClass("/dashboard")}
						>
							Dashboard
						</Link>
						<Link
							href="/juror"
							aria-current={path === "/juror" ? "page" : undefined}
							className={linkClass("/juror")}
						>
							Juror
						</Link>
						<Link
							href="/reputation"
							aria-current={path === "/reputation" ? "page" : undefined}
							className={linkClass("/reputation")}
						>
							Reputation
						</Link>
					</nav>
				</div>
				<div className="flex items-center gap-3">
					<RoleToggle />
					{githubUrl !== undefined && githubUrl !== "" && (
						<a
							href={githubUrl}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="View source on GitHub"
							className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 rounded-lg"
						>
							<GitHubIcon />
						</a>
					)}
					<ContrastToggle />
					<ThemeToggle />
					<ConnectButton />
				</div>
			</div>
		</header>
	);
}
