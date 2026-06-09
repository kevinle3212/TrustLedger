import { FooterHelp } from "@/components/FooterHelp";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link } from "@/i18n/navigation";

function FaqFooterIcon(): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="size-4"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M10 16h.01" />
			<path d="M7.8 7.8a2.3 2.3 0 1 1 4.1 1.4c-.7.6-1.4 1-1.6 1.9" />
			<circle cx="10" cy="10" r="8" />
		</svg>
	);
}

function LegalFooterIcon(): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			className="size-4"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.7"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M6 3.5h8l2 2v11H6z" />
			<path d="M14 3.5v3h3" />
			<path d="M8.5 9h5" />
			<path d="M8.5 12h5" />
		</svg>
	);
}

export function Footer(): React.JSX.Element {
	return (
		<footer className="border-t border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
			<div className="tl-site-frame flex flex-col gap-4 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between dark:text-gray-400">
				<div className="grid gap-1">
					<p>&copy; 2026 TrustLedger</p>
					<p>
						Authors &amp; Contributors:{" "}
						<a
							href="https://www.linkedin.com/in/lekevin1"
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 hover:text-indigo-600 dark:text-gray-200 dark:decoration-white/20 dark:hover:text-indigo-300"
						>
							Kevin Le
						</a>
						{", "}
						<a
							href="https://www.linkedin.com/in/kellen-snider-683396256/"
							target="_blank"
							rel="noopener noreferrer"
							className="font-medium text-gray-700 underline decoration-gray-300 underline-offset-4 hover:text-indigo-600 dark:text-gray-200 dark:decoration-white/20 dark:hover:text-indigo-300"
						>
							Kellen Snider
						</a>
					</p>
				</div>
				<div className="flex w-full flex-col gap-3 sm:ms-auto sm:w-auto sm:flex-row sm:items-center">
					<Link
						href="/faq"
						className="tl-button-motion inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white sm:w-auto"
						aria-label="Open frequently asked questions"
					>
						<FaqFooterIcon />
						<span>FAQ</span>
					</Link>
					<Link
						href="/legal"
						className="tl-button-motion inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white sm:w-auto"
						aria-label="Open legal center"
					>
						<LegalFooterIcon />
						<span>Legal</span>
					</Link>
					<FooterHelp />
					<LocaleSwitcher />
				</div>
			</div>
		</footer>
	);
}
