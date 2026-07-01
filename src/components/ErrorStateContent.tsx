import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { GoBackButton } from "@/components/GoBackButton";

/**
 * Decorative fault scene shared by every branded HTTP error page: a status core
 * pulses inside two concentric rings that expand outward on a loop. Purely
 * presentational (`aria-hidden`); the heading and body copy carry all meaning
 * for assistive tech. Every animated layer is frozen under
 * `prefers-reduced-motion`.
 */
export function ErrorScene(): React.JSX.Element {
	return (
		<svg viewBox="0 0 240 220" role="img" aria-hidden="true" className="h-auto w-full max-w-72">
			<g transform="translate(120 110)">
				<circle
					className="tl-error-ring text-indigo-500/40 dark:text-indigo-300/30"
					r="46"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<circle
					className="tl-error-ring tl-error-ring--delayed text-indigo-500/30 dark:text-indigo-300/20"
					r="46"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<circle className="tl-error-core fill-indigo-50 dark:fill-white/5" r="40" />
				<circle
					className="tl-error-core text-indigo-500 dark:text-indigo-300"
					r="40"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
				/>
				{/* Broken-link glyph: two clasps with a gap, evoking an interrupted ledger entry. */}
				<g
					className="tl-error-core stroke-indigo-600 dark:stroke-indigo-300"
					strokeWidth="6"
					strokeLinecap="round"
					fill="none"
				>
					<path d="M-18 -6a12 12 0 0 0 0 12h8" />
					<path d="M18 -6a12 12 0 0 1 0 12h-8" />
				</g>
				<line
					x1="-4"
					y1="0"
					x2="4"
					y2="0"
					className="stroke-indigo-600 dark:stroke-indigo-300"
					strokeWidth="6"
					strokeLinecap="round"
					strokeDasharray="0.5 7"
				/>
			</g>
		</svg>
	);
}

/**
 * Body of a branded HTTP error page (400, 403, 408, 429, 500, 502, 503, 504),
 * mirroring the animated 401 page. Reads its eyebrow, title, and body from the
 * `ErrorPages.codes.<status>` message group, and always offers recovery
 * actions: Go Home, Go Back, and Open Dashboard. The status code is shown as a
 * large headline, matching the 401 design template.
 *
 * @param status - The HTTP status code whose copy and headline to render.
 */
export function ErrorStateContent({ status }: { status: number }): React.JSX.Element {
	const t = useTranslations("ErrorPages");
	const code = String(status);

	return (
		<section className="tl-site-frame flex min-h-[70vh] items-center py-12">
			<div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
				<div className="max-w-3xl">
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						{t(`codes.${code}.eyebrow`)}
					</p>
					<h1 className="mt-3 text-7xl font-bold tracking-[-0.04em] text-gray-950 sm:text-8xl dark:text-white">
						{code}
					</h1>
					<h2 className="mt-4 text-xl font-semibold tracking-[-0.01em] text-gray-800 sm:text-2xl dark:text-gray-100">
						{t(`codes.${code}.title`)}
					</h2>
					<p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
						{t(`codes.${code}.body`)}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href="/"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("goHome")}
						</Link>
						<GoBackButton label={t("goBack")} />
						<Link
							href="/dashboard"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("openDashboard")}
						</Link>
					</div>
				</div>
				<div className="mx-auto flex w-full max-w-80 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
					<ErrorScene />
				</div>
			</div>
		</section>
	);
}
