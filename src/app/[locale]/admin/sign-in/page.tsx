import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "Admin" });
	return {
		title: t("signInMetadata.title"),
		description: t("signInMetadata.description"),
	};
}

export default async function AdminSignInPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "Admin" });

	return (
		<main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-12">
			<section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-950">
				<p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
					{t("signInEyebrow")}
				</p>
				<h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
					{t("signInTitle")}
				</h1>
				<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
					{t("signInIntro")}
				</p>

				<form action="/api/admin/session" method="post" className="mt-6 grid gap-4">
					<label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
						{t("emailOrUsername")}
						<input
							name="usernameOrEmail"
							autoComplete="username"
							required
							className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 font-normal text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
						/>
					</label>
					<label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
						{t("password")}
						<input
							name="password"
							type="password"
							autoComplete="current-password"
							required
							className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 font-normal text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
						/>
					</label>
					<label className="grid gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
						{t("walletAddress")}
						<input
							name="walletAddress"
							autoComplete="off"
							placeholder="0x..."
							className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 font-normal text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
						/>
					</label>
					<button
						type="submit"
						className="tl-button-motion min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
					>
						{t("openAdminDashboard")}
					</button>
				</form>
			</section>
		</main>
	);
}
