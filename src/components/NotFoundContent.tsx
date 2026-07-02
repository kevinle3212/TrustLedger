import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { CowErrorScene } from "@/components/CowErrorScene";

/** 404 page body rendered by the `not-found.tsx` App Router segment. */
export function NotFoundContent(): React.JSX.Element {
	const t = useTranslations("NotFound");

	return (
		<section className="tl-site-frame flex min-h-[70vh] items-center py-12">
			<div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
				<div className="max-w-3xl">
					<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
						{t("eyebrow")}
					</p>
					<h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-5xl dark:text-white">
						{t("title")}
					</h1>
					<p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
						{t("body")}
					</p>
					<div className="mt-8 flex flex-col gap-3 sm:flex-row">
						<Link
							href="/dashboard"
							className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("openDashboard")}
						</Link>
						<Link
							href="/faq"
							className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("readFaq")}
						</Link>
						<Link
							href="/"
							className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("goHome")}
						</Link>
					</div>
				</div>
				<div className="mx-auto flex w-full max-w-80 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
					<CowErrorScene />
				</div>
			</div>
		</section>
	);
}
