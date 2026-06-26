"use client";

import type React from "react";

import type { StakeAssetStatus } from "@/lib/staking/config";
import type { StakeAssetId } from "@/lib/staking/assets";

/**
 * Accessible asset selector for the dual-asset staking flow. Renders an ARIA `radiogroup` of
 * the configured stake assets (ETH, USDC, SOL). Asset symbols/names come from the asset
 * registry (data, not hardcoded copy) and the localized group/status labels are passed in by
 * the parent, so this component holds no translatable strings of its own.
 */
export interface AssetSelectorProps {
	readonly statuses: readonly StakeAssetStatus[];
	readonly value: StakeAssetId;
	readonly onChange: (asset: StakeAssetId) => void;
	/** Localized group label (e.g. "Asset"), used as the radiogroup's accessible name. */
	readonly groupLabel: string;
	/** Localized status text for the configured/unconfigured badge, keyed by configured state. */
	readonly statusLabel: (configured: boolean) => string;
}

export function AssetSelector({
	statuses,
	value,
	onChange,
	groupLabel,
	statusLabel,
}: AssetSelectorProps): React.JSX.Element {
	function handleKey(event: React.KeyboardEvent<HTMLDivElement>): void {
		if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
		event.preventDefault();
		const index = statuses.findIndex((status) => status.asset.id === value);
		if (index === -1) return;
		const delta = event.key === "ArrowRight" ? 1 : -1;
		const next = statuses[(index + delta + statuses.length) % statuses.length];
		if (next === undefined) return;
		onChange(next.asset.id);
	}

	return (
		<div
			role="radiogroup"
			aria-label={groupLabel}
			className="tl-asset-selector"
			tabIndex={-1}
			onKeyDown={handleKey}
		>
			{statuses.map((status) => {
				const selected = status.asset.id === value;
				return (
					<button
						key={status.asset.id}
						type="button"
						role="radio"
						aria-checked={selected}
						tabIndex={selected ? 0 : -1}
						onClick={() => {
							onChange(status.asset.id);
						}}
						className={`tl-asset-option${selected ? " tl-asset-option--selected" : ""}`}
					>
						<span className="tl-asset-option__symbol">{status.asset.symbol}</span>
						<span className="tl-asset-option__name">{status.asset.name}</span>
						<span
							className={`tl-asset-option__status${
								status.configured ? " tl-asset-option__status--ready" : ""
							}`}
							title={statusLabel(status.configured)}
						>
							{statusLabel(status.configured)}
						</span>
					</button>
				);
			})}
		</div>
	);
}
