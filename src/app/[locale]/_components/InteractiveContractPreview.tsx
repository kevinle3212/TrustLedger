"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ContractPhase = "PENDING" | "ACTIVE" | "APPROVED";
type PreviewScene = "contract" | "juror" | "reputation";

interface InteractiveContractPreviewProps {
	readonly title: string;
	readonly amountLabel: string;
	readonly deadlineLabel: string;
	readonly deadlineValue: string;
	readonly holdBackLabel: string;
	readonly documentLabel: string;
	readonly viewLabel: string;
	readonly statuses: Readonly<Record<ContractPhase, string>>;
}

const PHASES = ["PENDING", "ACTIVE", "APPROVED"] as const satisfies readonly ContractPhase[];

const PHASE_META = {
	PENDING: {
		amount: "0.25 ETH",
		holdBack: "5%",
		progress: 26,
		actionKey: "previewFundEscrow",
		documentStateKey: "previewDraftHashQueued",
	},
	ACTIVE: {
		amount: "0.75 ETH",
		holdBack: "10%",
		progress: 62,
		actionKey: "previewSubmitWork",
		documentStateKey: "previewDocumentEncrypted",
	},
	APPROVED: {
		amount: "0.75 ETH",
		holdBack: "0%",
		progress: 100,
		actionKey: "previewReleasePayout",
		documentStateKey: "previewPayoutReceiptReady",
	},
} as const satisfies Record<
	ContractPhase,
	{
		readonly amount: string;
		readonly holdBack: string;
		readonly progress: number;
		readonly actionKey: string;
		readonly documentStateKey: string;
	}
>;

const SCENE_KEYS = ["contract", "juror", "reputation"] as const satisfies readonly PreviewScene[];

const FALLBACK_SCENE = {
	key: "contract",
	label: "Contract View",
	title: "Escrow Protection",
	note: "Encrypted Draft Ready",
	kicker: "Freelancer Milestone",
} as const satisfies PreviewSceneCopy;

interface PreviewSceneCopy {
	readonly key: PreviewScene;
	readonly label: string;
	readonly title: string;
	readonly note: string;
	readonly kicker: string;
}

export function InteractiveContractPreview({
	title,
	amountLabel,
	deadlineLabel,
	deadlineValue,
	holdBackLabel,
	documentLabel,
	viewLabel,
	statuses,
}: InteractiveContractPreviewProps): React.JSX.Element {
	const t = useTranslations("Home");
	const [phase, setPhase] = useState<ContractPhase>("ACTIVE");
	const [scene, setScene] = useState<PreviewScene>("contract");
	const [pulseKey, setPulseKey] = useState(0);
	const scenes = useMemo(
		(): PreviewSceneCopy[] =>
			SCENE_KEYS.map((key) => ({
				key,
				label: t(`previewScenes.${key}.label`),
				title: t(`previewScenes.${key}.title`),
				note: t(`previewScenes.${key}.note`),
				kicker: t(`previewScenes.${key}.kicker`),
			})),
		[t],
	);
	const meta = PHASE_META[phase];
	const sceneIndex = useMemo(
		() => scenes.findIndex((item) => item.key === scene),
		[scene, scenes],
	);
	const activeScene = scenes[sceneIndex] ?? scenes[0] ?? FALLBACK_SCENE;

	const phaseIndex = useMemo(() => PHASES.indexOf(phase), [phase]);

	function updatePhase(nextPhase: ContractPhase): void {
		setPhase(nextPhase);
		setPulseKey((current) => current + 1);
	}

	function updateScene(direction: -1 | 1): void {
		const nextIndex = (sceneIndex + direction + scenes.length) % scenes.length;
		setScene(scenes[nextIndex]?.key ?? "contract");
		setPulseKey((current) => current + 1);
	}

	return (
		<div className="tl-contract-stage tl-motion-card rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
			<div className="tl-contract-orbit" aria-hidden="true" />
			<div className="relative mb-4 flex items-center justify-between gap-3">
				<button
					type="button"
					onClick={() => {
						updateScene(-1);
					}}
					aria-label={t("previousPreview")}
					className="tl-button-motion flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:text-indigo-700 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200"
				>
					‹
				</button>
				<div className="min-w-0 text-center">
					<p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">
						{activeScene.label}
					</p>
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{activeScene.kicker}
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						updateScene(1);
					}}
					aria-label={t("nextPreview")}
					className="tl-button-motion flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:text-indigo-700 dark:border-white/10 dark:bg-gray-950 dark:text-gray-200"
				>
					›
				</button>
			</div>
			<div className="relative rounded-xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-gray-950">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<p className="font-mono text-xs text-gray-500">#18</p>
						<h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
							{scene === "contract" ? title : activeScene.title}
						</h2>
					</div>
					<span className="tl-status-badge tl-status-badge--active rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300">
						{statuses[phase]}
					</span>
				</div>

				<div className="mt-5" aria-label={t("exampleContractProgress")}>
					<div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
						<div
							key={pulseKey}
							className="tl-contract-progress h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
							style={{ width: `${String(meta.progress)}%` }}
						/>
					</div>
					<div className="mt-2 flex justify-between text-[0.7rem] font-medium text-gray-500 dark:text-gray-400">
						{PHASES.map((item) => (
							<span
								key={item}
								className={
									item === phase ? "text-indigo-600 dark:text-indigo-300" : ""
								}
							>
								{statuses[item]}
							</span>
						))}
					</div>
				</div>

				<div className="tl-kv-grid mt-6 text-sm">
					<span className="text-gray-500 dark:text-gray-400">{amountLabel}</span>
					<span className="tl-flip-value font-medium text-gray-950 dark:text-white">
						{scene === "juror"
							? t("previewJurorStake")
							: scene === "reputation"
								? "92 / 100"
								: meta.amount}
					</span>
					<span className="text-gray-500 dark:text-gray-400">{deadlineLabel}</span>
					<span className="font-medium text-gray-950 dark:text-white">
						{scene === "juror"
							? t("previewRevealWindowOpen")
							: scene === "reputation"
								? t("previewRatingsReceived")
								: deadlineValue}
					</span>
					<span className="text-gray-500 dark:text-gray-400">{holdBackLabel}</span>
					<span className="tl-flip-value font-medium text-gray-950 dark:text-white">
						{scene === "juror"
							? t("previewMajorityVote")
							: scene === "reputation"
								? t("previewRecoveryBonus")
								: meta.holdBack}
					</span>
					<span className="text-gray-500 dark:text-gray-400">{documentLabel}</span>
					<span className="font-medium text-indigo-600 dark:text-indigo-400">
						{scene === "contract" ? viewLabel : activeScene.note}
					</span>
				</div>

				<div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
					<p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
						{scene === "contract" ? t(meta.documentStateKey) : activeScene.note}
					</p>
					<div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-3">
						<div className="tl-contract-hash h-2 rounded-full bg-gray-200 dark:bg-white/10">
							<div
								key={`document-progress-${String(pulseKey)}`}
								className="tl-contract-install-progress h-full rounded-full"
							/>
						</div>
						<span className="tl-signature-stamp rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[0.68rem] font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
							{t("verified")}
						</span>
					</div>
				</div>
			</div>

			<div className="relative mt-4 grid gap-2 text-center text-xs font-medium text-gray-600 dark:text-gray-300 sm:grid-cols-3">
				{PHASES.map((item, index) => (
					<button
						key={item}
						type="button"
						onClick={() => {
							updatePhase(item);
						}}
						className={`tl-contract-step tl-button-motion rounded-lg border px-2 py-2 ${
							item === phase
								? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-300"
								: "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-gray-950 dark:hover:border-white/20"
						}`}
						aria-pressed={item === phase}
					>
						<span className="font-mono text-[0.65rem] text-gray-400">0{index + 1}</span>{" "}
						{statuses[item]}
					</button>
				))}
			</div>

			<button
				type="button"
				onClick={() => {
					updatePhase(PHASES[(phaseIndex + 1) % PHASES.length] ?? "PENDING");
				}}
				className="tl-settlement-button relative mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
			>
				{t(meta.actionKey)}
			</button>
		</div>
	);
}
