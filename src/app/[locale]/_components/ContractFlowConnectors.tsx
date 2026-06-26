"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative animated connector layer for the example-contract stage.
 *
 * Renders faint SVG "wires" with glowing pulses that travel along each path via
 * an animated `stroke-dashoffset` — a lightweight data-flow effect that reads as
 * particles racing between contract nodes. It is purely ornamental:
 * `aria-hidden`, non-interactive, and rendered behind the card content so it can
 * never affect readability or hit-testing.
 *
 * Performance and accessibility:
 * - The animation runs on a handful of short dashed strokes (no per-frame JS),
 *   so it stays smooth and cheap.
 * - An `IntersectionObserver` pauses the animation whenever the stage scrolls
 *   off-screen, avoiding wasted compositor work.
 * - `prefers-reduced-motion: reduce` is honored globally (see `globals.scss`),
 *   which freezes the pulses for motion-sensitive users.
 */
export function ContractFlowConnectors(): React.JSX.Element {
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const node = rootRef.current;
		if (node === null || typeof IntersectionObserver !== "function") return;

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry === undefined) return;
				node.dataset["active"] = entry.isIntersecting ? "true" : "false";
			},
			{ rootMargin: "120px" },
		);
		observer.observe(node);
		return (): void => {
			observer.disconnect();
		};
	}, []);

	return (
		<div ref={rootRef} className="tl-flow" data-active="true" aria-hidden="true">
			<svg
				className="tl-flow__svg"
				viewBox="0 0 320 200"
				fill="none"
				preserveAspectRatio="xMidYMid slice"
			>
				<g className="tl-flow__wires">
					<path d="M24 40 C 110 40, 130 110, 220 110" />
					<path d="M40 168 C 120 168, 150 96, 296 76" />
					<path d="M60 24 C 60 90, 200 120, 300 150" />
				</g>
				<g className="tl-flow__pulses">
					<path className="tl-flow__pulse" d="M24 40 C 110 40, 130 110, 220 110" />
					<path
						className="tl-flow__pulse tl-flow__pulse--slow"
						d="M40 168 C 120 168, 150 96, 296 76"
					/>
					<path
						className="tl-flow__pulse tl-flow__pulse--fast"
						d="M60 24 C 60 90, 200 120, 300 150"
					/>
				</g>
			</svg>
		</div>
	);
}
