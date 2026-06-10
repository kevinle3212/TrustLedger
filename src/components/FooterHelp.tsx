"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

function GuideBookIcon(): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			className="size-5"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M12 6.5v13" />
			<path d="M5 4.5h4.5A2.5 2.5 0 0 1 12 7v12.5a2.5 2.5 0 0 0-2.5-2.5H5z" />
			<path d="M19 4.5h-4.5A2.5 2.5 0 0 0 12 7v12.5a2.5 2.5 0 0 1 2.5-2.5H19z" />
		</svg>
	);
}

export function FooterHelp(): React.JSX.Element | null {
	const [open, setOpen] = useState(false);
	const [activeGuide, setActiveGuide] = useState(0);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const t = useTranslations("FooterHelp");

	useEffect(() => {
		if (!open) return;
		closeButtonRef.current?.focus();
	}, [open]);

	function closeDialog(): void {
		setOpen(false);
	}

	const guides = [
		{
			title: t("stepCreateTitle"),
			body: t("stepCreateBody"),
			href: "/create" as const,
			linkLabel: t("stepCreateLink"),
			tasks: [t("stepCreateTaskOne"), t("stepCreateTaskTwo"), t("stepCreateTaskThree")],
		},
		{
			title: t("stepDashboardTitle"),
			body: t("stepDashboardBody"),
			href: "/dashboard" as const,
			linkLabel: t("stepDashboardLink"),
			tasks: [
				t("stepDashboardTaskOne"),
				t("stepDashboardTaskTwo"),
				t("stepDashboardTaskThree"),
			],
		},
		{
			title: t("stepDraftTitle"),
			body: t("stepDraftBody"),
			href: "/create" as const,
			linkLabel: t("stepDraftLink"),
			tasks: [t("stepDraftTaskOne"), t("stepDraftTaskTwo"), t("stepDraftTaskThree")],
		},
		{
			title: t("stepDocumentTitle"),
			body: t("stepDocumentBody"),
			href: "/create" as const,
			linkLabel: t("stepDocumentLink"),
			tasks: [t("stepDocumentTaskOne"), t("stepDocumentTaskTwo"), t("stepDocumentTaskThree")],
		},
		{
			title: t("stepJurorTitle"),
			body: t("stepJurorBody"),
			href: "/juror" as const,
			linkLabel: t("stepJurorLink"),
			tasks: [t("stepJurorTaskOne"), t("stepJurorTaskTwo"), t("stepJurorTaskThree")],
		},
		{
			title: t("stepArbitrationTitle"),
			body: t("stepArbitrationBody"),
			href: "/dashboard" as const,
			linkLabel: t("stepArbitrationLink"),
			tasks: [
				t("stepArbitrationTaskOne"),
				t("stepArbitrationTaskTwo"),
				t("stepArbitrationTaskThree"),
			],
		},
		{
			title: t("stepReputationTitle"),
			body: t("stepReputationBody"),
			href: "/reputation" as const,
			linkLabel: t("stepReputationLink"),
			tasks: [
				t("stepReputationTaskOne"),
				t("stepReputationTaskTwo"),
				t("stepReputationTaskThree"),
			],
		},
		{
			title: t("stepWalletTitle"),
			body: t("stepWalletBody"),
			href: "/faq" as const,
			linkLabel: t("stepWalletLink"),
			tasks: [t("stepWalletTaskOne"), t("stepWalletTaskTwo"), t("stepWalletTaskThree")],
		},
		{
			title: t("stepLegalTitle"),
			body: t("stepLegalBody"),
			href: "/legal" as const,
			linkLabel: t("stepLegalLink"),
			tasks: [t("stepLegalTaskOne"), t("stepLegalTaskTwo"), t("stepLegalTaskThree")],
		},
		{
			title: t("stepFaqTitle"),
			body: t("stepFaqBody"),
			href: "/faq" as const,
			linkLabel: t("stepFaqLink"),
			tasks: [t("stepFaqTaskOne"), t("stepFaqTaskTwo"), t("stepFaqTaskThree")],
		},
		{
			title: t("stepAnalyticsTitle"),
			body: t("stepAnalyticsBody"),
			href: "/analytics" as const,
			linkLabel: t("stepAnalyticsLink"),
			tasks: [
				t("stepAnalyticsTaskOne"),
				t("stepAnalyticsTaskTwo"),
				t("stepAnalyticsTaskThree"),
			],
		},
	];
	const active = guides[activeGuide] ?? guides[0];
	if (active === undefined) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => {
					setOpen(true);
				}}
				className="tl-button-motion inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white sm:w-auto"
				aria-label={t("buttonAriaLabel")}
				title={t("buttonTooltip")}
			>
				<GuideBookIcon />
				<span>{t("buttonLabel")}</span>
			</button>
			{open && (
				<dialog
					open
					aria-labelledby="footer-help-title"
					className="fixed inset-0 z-50 h-full max-h-none w-full max-w-none bg-gray-950/45 p-0"
					onCancel={(event) => {
						event.preventDefault();
						closeDialog();
					}}
				>
					<div className="flex min-h-full items-end px-4 py-4 sm:items-center sm:justify-center">
						<section className="tl-motion-card max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 dark:border-white/10 dark:bg-gray-950 dark:text-white sm:p-8">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div className="max-w-2xl">
									<h2
										id="footer-help-title"
										className="text-2xl font-semibold tracking-[-0.015em]"
									>
										{t("title")}
									</h2>
									<p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
										{t("intro")}
									</p>
								</div>
								<button
									ref={closeButtonRef}
									type="button"
									onClick={closeDialog}
									className="tl-button-motion rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
								>
									{t("close")}
								</button>
							</div>
							<div className="mt-8 grid gap-4 lg:grid-cols-[15rem_1fr]">
								<div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
									{guides.map((guide, index) => (
										<button
											key={guide.title}
											type="button"
											onClick={() => {
												setActiveGuide(index);
											}}
											className={`tl-button-motion rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
												activeGuide === index
													? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200"
													: "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-white/20"
											}`}
											aria-pressed={activeGuide === index}
										>
											{guide.title}
										</button>
									))}
								</div>
								<article className="tl-motion-card rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">
										{t("selectedGuide")}
									</p>
									<h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
										{active.title}
									</h3>
									<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
										{active.body}
									</p>
									<ul className="mt-4 grid gap-2">
										{active.tasks.map((task) => (
											<li
												key={task}
												className="flex gap-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200"
											>
												<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
													✓
												</span>
												{task}
											</li>
										))}
									</ul>
									<Link
										href={active.href}
										onClick={closeDialog}
										className="tl-button-motion mt-5 inline-flex min-h-10 items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
									>
										{active.linkLabel}
									</Link>
								</article>
							</div>
							<div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-white/10 sm:flex-row sm:justify-end">
								<Link
									href="/reputation"
									onClick={closeDialog}
									className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
								>
									{t("reputationLink")}
								</Link>
								<Link
									href="/create"
									onClick={closeDialog}
									className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
								>
									{t("primaryLink")}
								</Link>
							</div>
						</section>
					</div>
				</dialog>
			)}
		</>
	);
}
