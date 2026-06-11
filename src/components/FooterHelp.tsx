"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

type GuideHref =
	| "/analytics"
	| "/create"
	| "/dashboard"
	| "/faq"
	| "/juror"
	| "/legal"
	| "/reputation";

interface GuideStep {
	readonly title: string;
	readonly body: string;
	readonly href: GuideHref;
	readonly linkLabel: string;
	readonly tasks: readonly string[];
}

const GUIDE_SPECS = [
	["stepCreate", "/create"],
	["stepDashboard", "/dashboard"],
	["stepDraft", "/create"],
	["stepDocument", "/create"],
	["stepJuror", "/juror"],
	["stepArbitration", "/dashboard"],
	["stepReputation", "/reputation"],
	["stepWallet", "/faq"],
	["stepLegal", "/legal"],
	["stepFaq", "/faq"],
	["stepAnalytics", "/analytics"],
] as const satisfies readonly (readonly [string, GuideHref])[];

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

function buildGuides(t: ReturnType<typeof useTranslations<"FooterHelp">>): GuideStep[] {
	return GUIDE_SPECS.map(([key, href]) => ({
		title: t(`${key}Title`),
		body: t(`${key}Body`),
		href,
		linkLabel: t(`${key}Link`),
		tasks: [t(`${key}TaskOne`), t(`${key}TaskTwo`), t(`${key}TaskThree`)],
	}));
}

function GuideButton({ onOpen }: { readonly onOpen: () => void }): React.JSX.Element {
	const t = useTranslations("FooterHelp");
	return (
		<button
			type="button"
			onClick={onOpen}
			className="tl-button-motion inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white sm:w-auto"
			aria-label={t("buttonAriaLabel")}
			title={t("buttonTooltip")}
		>
			<GuideBookIcon />
			<span>{t("buttonLabel")}</span>
		</button>
	);
}

function GuideTopicList({
	guides,
	activeGuide,
	selectGuide,
}: {
	readonly guides: readonly GuideStep[];
	readonly activeGuide: number;
	readonly selectGuide: (index: number) => void;
}): React.JSX.Element {
	const guideProgress = ((activeGuide + 1) / guides.length) * 100;
	return (
		<div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
			<div className="mb-3 flex items-center justify-between gap-3 px-1">
				<p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
					{activeGuide + 1} / {guides.length}
				</p>
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
					<div
						className="h-full rounded-full bg-indigo-600 transition-[width] duration-300 ease-out dark:bg-indigo-400"
						style={{ width: `${guideProgress.toString()}%` }}
					/>
				</div>
			</div>
			<div className="grid max-h-[22rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1">
				{guides.map((guide, index) => (
					<button
						key={guide.title}
						type="button"
						onClick={() => {
							selectGuide(index);
						}}
						className={`tl-guide-topic tl-button-motion min-h-14 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
							activeGuide === index
								? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200"
								: "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-white/20"
						}`}
						aria-pressed={activeGuide === index}
					>
						<span className="flex items-center gap-2">
							<span
								className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
									activeGuide === index
										? "bg-indigo-600 text-white dark:bg-indigo-400 dark:text-gray-950"
										: "bg-white text-gray-500 dark:bg-gray-950 dark:text-gray-300"
								}`}
							>
								{index + 1}
							</span>
							<span className="min-w-0 leading-5">{guide.title}</span>
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

function GuideTaskPanel({
	active,
	activeTask,
	setActiveTask,
}: {
	readonly active: GuideStep;
	readonly activeTask: number;
	readonly setActiveTask: (index: number) => void;
}): React.JSX.Element {
	const currentTask = active.tasks[activeTask] ?? active.tasks[0];
	const taskProgress = ((activeTask + 1) / active.tasks.length) * 100;
	return (
		<div className="mt-5 overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50 dark:border-indigo-400/30 dark:bg-indigo-400/10">
			<div className="h-1.5 bg-indigo-100 dark:bg-indigo-950/60">
				<div
					className="h-full rounded-r-full bg-indigo-600 transition-[width] duration-300 ease-out dark:bg-indigo-300"
					style={{ width: `${taskProgress.toString()}%` }}
				/>
			</div>
			<div className="p-5">
				<p className="text-sm font-semibold text-indigo-800 dark:text-indigo-100">
					{currentTask}
				</p>
				<div className="mt-4 grid gap-2">
					{active.tasks.map((task, index) => (
						<button
							key={task}
							type="button"
							onClick={() => {
								setActiveTask(index);
							}}
							className={`tl-guide-task flex gap-3 rounded-xl border p-3 text-left text-sm transition ${
								activeTask === index
									? "border-indigo-300 bg-white text-gray-900 dark:border-indigo-300/40 dark:bg-gray-950 dark:text-white"
									: "border-indigo-100 bg-white/60 text-gray-700 hover:bg-white dark:border-white/10 dark:bg-gray-950/40 dark:text-gray-200 dark:hover:bg-gray-950"
							}`}
							aria-pressed={activeTask === index}
						>
							<span
								className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
									index <= activeTask
										? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
										: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-300"
								}`}
							>
								{index < activeTask ? "✓" : index + 1}
							</span>
							<span className="leading-5">{task}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

function GuidePanel({
	active,
	activeTask,
	activeGuide,
	guides,
	onClose,
	selectGuide,
	setActiveTask,
}: {
	readonly active: GuideStep;
	readonly activeTask: number;
	readonly activeGuide: number;
	readonly guides: readonly GuideStep[];
	readonly onClose: () => void;
	readonly selectGuide: (index: number) => void;
	readonly setActiveTask: (index: number | ((value: number) => number)) => void;
}): React.JSX.Element {
	const t = useTranslations("FooterHelp");
	return (
		<article className="tl-guide-panel tl-motion-card rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5 sm:p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
						{t("selectedGuide")}
					</p>
					<h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
						{active.title}
					</h3>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
						{active.body}
					</p>
				</div>
				<div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 dark:border-white/10 dark:bg-gray-950 dark:text-gray-300">
					Task {activeTask + 1} Of {active.tasks.length}
				</div>
			</div>
			<GuideTaskPanel
				active={active}
				activeTask={activeTask}
				setActiveTask={(index) => {
					setActiveTask(index);
				}}
			/>
			<div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => {
							setActiveTask((value) => Math.max(0, value - 1));
						}}
						disabled={activeTask === 0}
						className="tl-button-motion inline-flex min-h-10 items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
					>
						{t("back")}
					</button>
					<button
						type="button"
						onClick={() => {
							if (activeTask < active.tasks.length - 1) {
								setActiveTask((value) => value + 1);
								return;
							}
							selectGuide(Math.min(guides.length - 1, activeGuide + 1));
						}}
						disabled={
							activeGuide === guides.length - 1 &&
							activeTask === active.tasks.length - 1
						}
						className="tl-button-motion inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{activeTask < active.tasks.length - 1 ? t("nextStep") : t("nextGuide")}
					</button>
				</div>
				<Link
					href={active.href}
					onClick={onClose}
					className="tl-button-motion inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
				>
					{active.linkLabel}
				</Link>
			</div>
		</article>
	);
}

function FooterHelpDialog({
	activeGuide,
	activeTask,
	closeButtonRef,
	guides,
	onClose,
	selectGuide,
	setActiveTask,
}: {
	readonly activeGuide: number;
	readonly activeTask: number;
	readonly closeButtonRef: React.RefObject<HTMLButtonElement | null>;
	readonly guides: readonly GuideStep[];
	readonly onClose: () => void;
	readonly selectGuide: (index: number) => void;
	readonly setActiveTask: (index: number | ((value: number) => number)) => void;
}): React.JSX.Element | null {
	const t = useTranslations("FooterHelp");
	const active = guides[activeGuide] ?? guides[0];
	if (active === undefined) return null;

	return (
		<dialog
			open
			aria-labelledby="footer-help-title"
			className="fixed inset-0 z-50 h-full max-h-none w-full max-w-none bg-gray-950/45 p-0"
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			<div className="flex min-h-full items-end px-3 py-3 sm:items-center sm:justify-center sm:px-4 sm:py-4">
				<section className="tl-guide-dialog max-h-[calc(100vh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 dark:border-white/10 dark:bg-gray-950 dark:text-white sm:max-h-[calc(100vh-2rem)] sm:p-8">
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
							onClick={onClose}
							className="tl-button-motion rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
						>
							{t("close")}
						</button>
					</div>
					<div className="mt-8 grid gap-5 lg:grid-cols-[minmax(17rem,0.78fr)_minmax(0,1.22fr)]">
						<GuideTopicList
							guides={guides}
							activeGuide={activeGuide}
							selectGuide={selectGuide}
						/>
						<GuidePanel
							active={active}
							activeTask={activeTask}
							activeGuide={activeGuide}
							guides={guides}
							onClose={onClose}
							selectGuide={selectGuide}
							setActiveTask={setActiveTask}
						/>
					</div>
					<div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-white/10 sm:flex-row sm:justify-end">
						<Link
							href="/reputation"
							onClick={onClose}
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-white/10 dark:text-gray-200 dark:hover:border-white/20 dark:hover:text-white"
						>
							{t("reputationLink")}
						</Link>
						<Link
							href="/create"
							onClick={onClose}
							className="tl-button-motion inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
						>
							{t("primaryLink")}
						</Link>
					</div>
				</section>
			</div>
		</dialog>
	);
}

export function FooterHelp(): React.JSX.Element {
	const [open, setOpen] = useState(false);
	const [activeGuide, setActiveGuide] = useState(0);
	const [activeTask, setActiveTask] = useState(0);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const t = useTranslations("FooterHelp");
	const guides = useMemo(() => buildGuides(t), [t]);

	useEffect(() => {
		if (!open) return;
		closeButtonRef.current?.focus();
	}, [open]);

	function closeDialog(): void {
		setOpen(false);
	}

	function selectGuide(index: number): void {
		setActiveGuide(index);
		setActiveTask(0);
	}

	return (
		<>
			<GuideButton
				onOpen={() => {
					setOpen(true);
				}}
			/>
			{open && (
				<FooterHelpDialog
					activeGuide={activeGuide}
					activeTask={activeTask}
					closeButtonRef={closeButtonRef}
					guides={guides}
					onClose={closeDialog}
					selectGuide={selectGuide}
					setActiveTask={setActiveTask}
				/>
			)}
		</>
	);
}
