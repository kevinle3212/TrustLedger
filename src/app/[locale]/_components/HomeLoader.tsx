"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Full-viewport Home page loading overlay.
 *
 * Mounts with the page at 0% and advances a real progress bar as concrete
 * initialization milestones resolve (hydration, web-font readiness, the window
 * `load` event, and a committed paint), smoothly interpolating the displayed
 * percentage toward the current milestone target before fading away.
 *
 * Design constraints honored here:
 * - SSR and the first client render are byte-identical (0%, fully opaque), so
 *   there is no hydration mismatch and no flash of unstyled content.
 * - The overlay is `position: fixed`, so it never participates in document flow
 *   and cannot cause layout shift or content jumping.
 * - Progress reflects actual initialization work — no artificial timer drives
 *   the bar to 100%. The milestone target lives in a ref (it is never rendered
 *   directly, only eased into the displayed value), and the bar can only
 *   complete once every real milestone has resolved. A bounded easing fills the
 *   visual gap between milestones so the bar never appears frozen.
 * - `prefers-reduced-motion` is respected: the per-frame easing and the opacity
 *   fade are skipped, snapping between states instead.
 * - The semantics come from a native `<progress>` element, and with JavaScript
 *   disabled the overlay is hidden via a `<noscript>` style so it can never
 *   permanently mask the page.
 */
export function HomeLoader(): React.JSX.Element | null {
	const t = useTranslations("Home.loading");
	// Displayed percentage (0-100), eased toward the milestone target. This is
	// the only progress value rendered to the DOM.
	const [displayed, setDisplayed] = useState(0);
	// Unmounts the overlay after the fade-out transition ends.
	const [removed, setRemoved] = useState(false);

	// Milestone target, mutated as real init work resolves. Kept in a ref so
	// bumping it never triggers a render — only the eased `displayed` does.
	const targetRef = useRef(0);
	const reducedMotionRef = useRef(false);

	useEffect(() => {
		reducedMotionRef.current =
			typeof window.matchMedia === "function" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		let cancelled = false;
		let raf = 0;
		// Hydration is implied by this effect running; fonts and load resolve async.
		const reached = { fonts: false, loaded: false };

		// Recompute the target from resolved milestones. Each milestone is worth
		// an equal share up to 90%; the final jump to 100% only happens after a
		// committed paint following the window `load` event.
		const recompute = (): void => {
			const weight = 1 + (reached.fonts ? 1 : 0) + (reached.loaded ? 1 : 0);
			targetRef.current = Math.round((weight / 3) * 90);
		};
		recompute();

		// Web fonts ready (guards against a flash of unstyled / shifting text).
		if (typeof document !== "undefined" && "fonts" in document) {
			void document.fonts.ready.then(() => {
				reached.fonts = true;
				recompute();
			});
		} else {
			reached.fonts = true;
			recompute();
		}

		// Window load (all critical subresources fetched), then a committed paint.
		const markLoaded = (): void => {
			reached.loaded = true;
			recompute();
			requestAnimationFrame(() => {
				if (!cancelled) targetRef.current = 100;
			});
		};
		if (document.readyState === "complete") {
			markLoaded();
		} else {
			window.addEventListener("load", markLoaded, { once: true });
		}

		// Single animation-frame loop eases the displayed value toward the target.
		const tick = (): void => {
			if (cancelled) return;
			setDisplayed((current) => {
				const target = targetRef.current;
				if (reducedMotionRef.current) return target;
				const delta = target - current;
				if (Math.abs(delta) < 0.5) return target;
				return current + delta * 0.12;
			});
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);

		return (): void => {
			cancelled = true;
			cancelAnimationFrame(raf);
			window.removeEventListener("load", markLoaded);
		};
	}, []);

	const percent = Math.min(100, Math.round(displayed));
	// Complete once the eased value has effectively reached the 100% target.
	const done = displayed >= 99.5;

	// After completion, fade out then unmount.
	useEffect(() => {
		if (!done) return;
		const fadeMs = reducedMotionRef.current ? 0 : 480;
		const timer = window.setTimeout(() => {
			setRemoved(true);
		}, fadeMs);
		return (): void => {
			window.clearTimeout(timer);
		};
	}, [done]);

	if (removed) return null;

	return (
		<div
			className={`tl-home-loader tl-surface-page${done ? " tl-home-loader--done" : ""}`}
			aria-hidden={done ? "true" : undefined}
		>
			<noscript>
				<style>{".tl-home-loader{display:none!important}"}</style>
			</noscript>
			<div className="tl-home-loader__panel">
				<div className="tl-loader-orbit" aria-hidden="true">
					<span className="tl-loader-orbit__core" />
					<span className="tl-loader-orbit__ring" />
					<span className="tl-loader-orbit__dot tl-loader-orbit__dot--1" />
					<span className="tl-loader-orbit__dot tl-loader-orbit__dot--2" />
					<span className="tl-loader-orbit__dot tl-loader-orbit__dot--3" />
					<span className="tl-loader-shape tl-loader-shape--a" />
					<span className="tl-loader-shape tl-loader-shape--b" />
				</div>
				<p className="tl-home-loader__title">{t("title")}</p>
				<p className="tl-home-loader__subtitle tl-text-muted">{t("subtitle")}</p>
				<progress
					className="tl-home-loader__progress"
					max={100}
					value={percent}
					aria-label={t("progressLabel")}
				/>
				<p className="tl-home-loader__percent" aria-hidden="true">
					{percent}
					{"%"}
				</p>
			</div>
		</div>
	);
}
