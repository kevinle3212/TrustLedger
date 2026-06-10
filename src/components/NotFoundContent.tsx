import { Link } from "@/i18n/navigation";

export function NotFoundContent(): React.JSX.Element {
	return (
		<section className="tl-site-frame flex min-h-[70vh] items-center py-12">
			<div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
				<div className="max-w-3xl">
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						Page Not Found
					</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-5xl dark:text-white">
						This route is not in the ledger.
					</h1>
					<p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
						The link may be old, locale-specific, or tied to a contract that is not
						available from this route. Use the actions below to get back to a known
						workflow.
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href="/dashboard"
							className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							Open Dashboard
						</Link>
						<Link
							href="/faq"
							className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							Read FAQ
						</Link>
						<Link
							href="/"
							className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							Go Home
						</Link>
					</div>
				</div>
				<div
					aria-hidden="true"
					className="tl-not-found-mark relative mx-auto aspect-square w-full max-w-80 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5"
				>
					<div className="absolute inset-6 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-300/40" />
					<div className="relative flex h-full flex-col justify-between">
						<div className="h-3 w-24 rounded-full bg-indigo-500/70" />
						<div className="text-7xl font-semibold tracking-[-0.04em] text-gray-950 dark:text-white">
							404
						</div>
						<div className="grid gap-2">
							<div className="h-2 rounded-full bg-gray-300 dark:bg-white/20" />
							<div className="h-2 w-2/3 rounded-full bg-gray-200 dark:bg-white/10" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
