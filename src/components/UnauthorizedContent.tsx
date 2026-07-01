import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * Decorative scene for the 401 page: a cartoon cow tips forward and drops into
 * a hole on a loop, with a pulsing hole and a puff of dust. Purely presentational
 * (`aria-hidden`); the message and actions carry all meaning for assistive tech.
 * Every animated layer is frozen under `prefers-reduced-motion`.
 */
function FallingCowScene(): React.JSX.Element {
	return (
		<svg viewBox="0 0 240 220" role="img" aria-hidden="true" className="h-auto w-full max-w-72">
			{/* Ground */}
			<line
				x1="16"
				y1="168"
				x2="224"
				y2="168"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				className="text-gray-300 dark:text-white/20"
			/>
			{/* Hole */}
			<ellipse
				cx="120"
				cy="172"
				rx="52"
				ry="15"
				className="tl-cow-hole fill-gray-900/85 dark:fill-black"
			/>
			<ellipse cx="120" cy="170" rx="40" ry="10" className="fill-gray-950 dark:fill-black" />
			{/* Dust puffs as the cow drops in */}
			<g className="tl-cow-dust text-gray-400 dark:text-white/40">
				<circle cx="92" cy="160" r="5" fill="currentColor" />
				<circle cx="148" cy="158" r="6" fill="currentColor" />
				<circle cx="120" cy="150" r="4" fill="currentColor" />
			</g>
			{/* Cow */}
			<g className="tl-cow">
				{/* Legs */}
				<g
					className="stroke-gray-900 dark:stroke-gray-100"
					strokeWidth="7"
					strokeLinecap="round"
				>
					<line x1="96" y1="128" x2="96" y2="150" />
					<line x1="112" y1="130" x2="112" y2="152" />
					<line x1="132" y1="130" x2="132" y2="152" />
					<line x1="148" y1="128" x2="148" y2="150" />
				</g>
				{/* Body */}
				<rect
					x="84"
					y="96"
					width="80"
					height="42"
					rx="21"
					className="fill-white stroke-gray-900 dark:fill-gray-100 dark:stroke-gray-900"
					strokeWidth="3"
				/>
				{/* Spots */}
				<ellipse
					cx="108"
					cy="112"
					rx="9"
					ry="7"
					className="fill-gray-900 dark:fill-gray-800"
				/>
				<ellipse
					cx="140"
					cy="120"
					rx="7"
					ry="6"
					className="fill-gray-900 dark:fill-gray-800"
				/>
				{/* Tail */}
				<path
					d="M164 104c10 2 14 10 12 22"
					fill="none"
					className="stroke-gray-900 dark:stroke-gray-100"
					strokeWidth="3"
					strokeLinecap="round"
				/>
				{/* Head */}
				<g>
					<rect
						x="60"
						y="92"
						width="38"
						height="34"
						rx="15"
						className="fill-white stroke-gray-900 dark:fill-gray-100 dark:stroke-gray-900"
						strokeWidth="3"
					/>
					{/* Snout */}
					<rect
						x="56"
						y="106"
						width="20"
						height="18"
						rx="9"
						className="fill-pink-200 stroke-gray-900 dark:stroke-gray-900"
						strokeWidth="2.5"
					/>
					<circle cx="62" cy="115" r="1.8" className="fill-gray-900" />
					<circle cx="70" cy="115" r="1.8" className="fill-gray-900" />
					{/* Eye */}
					<circle cx="80" cy="103" r="2.6" className="fill-gray-900" />
					{/* Ear */}
					<path
						d="M92 90c8-4 14-2 16 4"
						fill="none"
						className="stroke-gray-900 dark:stroke-gray-100"
						strokeWidth="3"
						strokeLinecap="round"
					/>
					{/* Horns */}
					<path
						d="M74 92c-1-6 1-9 4-10"
						fill="none"
						className="stroke-gray-900 dark:stroke-gray-100"
						strokeWidth="3"
						strokeLinecap="round"
					/>
				</g>
			</g>
		</svg>
	);
}

/** Body of the 401 "unauthorized" page: a Cow 401 scene plus recovery actions. */
export function UnauthorizedContent(): React.JSX.Element {
	const t = useTranslations("Unauthorized");

	return (
		<section className="tl-site-frame flex min-h-[70vh] items-center py-12">
			<div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
				<div className="max-w-3xl">
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						{t("eyebrow")}
					</p>
					<h1 className="mt-3 text-7xl font-bold tracking-[-0.04em] text-gray-950 sm:text-8xl dark:text-white">
						401
					</h1>
					<h2 className="mt-4 text-xl font-semibold tracking-[-0.01em] text-gray-800 sm:text-2xl dark:text-gray-100">
						{t("message")}
					</h2>
					<p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
						{t("body")}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href="/"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("goHome")}
						</Link>
						<Link
							href="/dashboard"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("openDashboard")}
						</Link>
						<Link
							href="/faq"
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("readFaq")}
						</Link>
					</div>
				</div>
				<div className="mx-auto flex w-full max-w-80 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
					<FallingCowScene />
				</div>
			</div>
		</section>
	);
}
