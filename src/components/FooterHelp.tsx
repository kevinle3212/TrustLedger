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

export function FooterHelp(): React.JSX.Element {
	const [open, setOpen] = useState(false);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const t = useTranslations("FooterHelp");

	useEffect(() => {
		if (!open) return;
		closeButtonRef.current?.focus();
	}, [open]);

	function closeDialog(): void {
		setOpen(false);
	}

	const steps = [
		{
			title: t("stepCreateTitle"),
			body: t("stepCreateBody"),
			href: "/create" as const,
			linkLabel: t("stepCreateLink"),
		},
		{
			title: t("stepDashboardTitle"),
			body: t("stepDashboardBody"),
			href: "/dashboard" as const,
			linkLabel: t("stepDashboardLink"),
		},
		{
			title: t("stepJurorTitle"),
			body: t("stepJurorBody"),
			href: "/juror" as const,
			linkLabel: t("stepJurorLink"),
		},
	];

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
							<div className="mt-8 grid gap-4">
								{steps.map((step, index) => (
									<article
										key={step.title}
										className="tl-motion-card rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5"
									>
										<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
											<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 dark:border-white/15 dark:bg-gray-950 dark:text-gray-200">
												{index + 1}
											</span>
											<div className="min-w-0 flex-1">
												<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
													{step.title}
												</h3>
												<p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
													{step.body}
												</p>
												<Link
													href={step.href}
													onClick={closeDialog}
													className="tl-button-motion mt-3 inline-flex min-h-10 items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
												>
													{step.linkLabel}
												</Link>
											</div>
										</div>
									</article>
								))}
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
