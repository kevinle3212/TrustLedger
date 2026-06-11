import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

interface FaqItem {
	question: string;
	answer: string;
}

const FAQ_ITEM_KEYS = ["one", "two", "three", "four", "five", "six", "seven"] as const;

function FaqIcon(): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			className="size-6"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 19h.01" />
			<path d="M9.1 9a3 3 0 1 1 5.5 1.7c-.8.7-1.6 1.2-2 2.3-.1.3-.1.6-.1 1" />
			<path d="M4.8 5.8A9.5 9.5 0 1 0 19.2 18.2 9.5 9.5 0 0 0 4.8 5.8" />
		</svg>
	);
}

export function FaqContent(): React.JSX.Element {
	const t = useTranslations("FAQ");
	const items = FAQ_ITEM_KEYS.map(
		(key): FaqItem => ({
			question: t(`items.${key}.question`),
			answer: t(`items.${key}.answer`),
		}),
	);

	return (
		<section className="tl-site-frame py-10 sm:py-14">
			<div className="max-w-3xl">
				<div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200">
					<FaqIcon />
					<span>{t("eyebrow")}</span>
				</div>
				<h1 className="mt-5 text-3xl font-semibold tracking-[-0.02em] text-gray-950 sm:text-4xl dark:text-white">
					{t("title")}
				</h1>
				<p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
					{t("introBefore")}{" "}
					<a
						href="https://github.com/kevinle3212/TrustLedger/discussions"
						target="_blank"
						rel="noopener noreferrer"
						className="font-semibold text-indigo-600 underline decoration-indigo-300 underline-offset-4 hover:text-indigo-500 dark:text-indigo-300"
					>
						GitHub Discussions
					</a>{" "}
					{t("introAfter")}
				</p>
			</div>

			<div className="mt-10 grid gap-4">
				{items.map((item) => (
					<details
						key={item.question}
						className="group rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-colors open:bg-white hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:open:bg-white/[0.07] dark:hover:border-white/20"
					>
						<summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-white [&::-webkit-details-marker]:hidden">
							<span>{item.question}</span>
							<span
								aria-hidden="true"
								className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-transform duration-200 group-open:rotate-45 dark:border-white/15 dark:text-gray-300"
							>
								+
							</span>
						</summary>
						<div className="tl-faq-answer">
							<p className="max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
								{item.answer}
							</p>
						</div>
					</details>
				))}
			</div>

			<div className="mt-10 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold text-gray-950 dark:text-white">
						{t("detailTitle")}
					</h2>
					<p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
						{t("detailBody")}
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Link
						href="/create"
						className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
					>
						{t("createContract")}
					</Link>
					<a
						href="https://github.com/kevinle3212/TrustLedger/blob/main/docs/FAUCETS.md"
						className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
					>
						{t("faucetGuide")}
					</a>
				</div>
			</div>
		</section>
	);
}
