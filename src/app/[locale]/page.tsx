import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata = {
	title: "TrustLedger",
	description: "Decentralized freelance escrow powered by Ethereum smart contracts.",
};

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<React.JSX.Element> {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations("Home");

	const features = [
		{ title: t("featureEscrowTitle"), desc: t("featureEscrowDesc") },
		{ title: t("featureArbitrationTitle"), desc: t("featureArbitrationDesc") },
		{ title: t("featureWarrantyTitle"), desc: t("featureWarrantyDesc") },
	];

	return (
		<div className="max-w-4xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-10">
			<div className="flex flex-col items-center gap-4">
				<span className="text-xs font-semibold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
					{t("builtOn")}
				</span>
				<h1 className="text-5xl font-bold tracking-tight leading-tight">
					{t("headline1")}
					<br />
					<span className="text-indigo-600 dark:text-indigo-400">{t("headline2")}</span>
				</h1>
				<p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl">{t("subtext")}</p>
			</div>

			<div className="flex gap-4 flex-wrap justify-center">
				<Link
					href="/create"
					className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
				>
					{t("createContract")}
				</Link>
				<Link
					href="/dashboard"
					className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors"
				>
					{t("viewContracts")}
				</Link>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mt-8">
				{features.map((f) => (
					<div
						key={f.title}
						className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-6 text-left flex flex-col gap-2"
					>
						<h3 className="font-semibold text-gray-900 dark:text-white">{f.title}</h3>
						<p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
					</div>
				))}
			</div>
		</div>
	);
}
