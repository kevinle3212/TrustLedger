import Link from "next/link";

export default function RootNotFound(): React.JSX.Element {
	return (
		<main className="min-h-screen bg-white px-6 py-16 text-gray-950 dark:bg-gray-950 dark:text-white">
			<section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center">
				<p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">
					Page Not Found
				</p>
				<h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em]">
					This TrustLedger route does not exist.
				</h1>
				<p className="mt-4 text-base leading-7 text-gray-600 dark:text-gray-300">
					Choose a locale-aware route to continue.
				</p>
				<div className="mt-8 flex flex-col gap-3 sm:flex-row">
					<Link
						href="/en"
						className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white"
					>
						Go Home
					</Link>
					<Link
						href="/en/faq"
						className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:border-white/10 dark:text-gray-200"
					>
						Read FAQ
					</Link>
				</div>
			</section>
		</main>
	);
}
