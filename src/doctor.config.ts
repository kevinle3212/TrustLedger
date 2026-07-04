const config = {
	ignore: {
		overrides: [
			{
				// react-doctor detects itself as "unused" because it is a CLI tool,
				// not an import. It is used via `npm run doctor`.
				files: ["package.json"],
				rules: ["deslop/unused-dev-dependency"],
			},
			{
				// Chart wrappers statically import recharts on purpose: they are leaf
				// components loaded by consumers via next/dynamic (see
				// AnalyticsPageInner), so recharts is already split into its own chunk.
				// role="img" wraps an SVG chart — <img> is a void element and cannot
				// contain the chart, so the ARIA role is the correct pattern here.
				files: ["components/charts/**/*.tsx"],
				rules: ["react-doctor/prefer-dynamic-import", "react-doctor/prefer-tag-over-role"],
			},
			{
				// The core/ layer is a deliberate barrel: each module is re-exported
				// through core/core.ts via `export *`, which this heuristic does not
				// credit as a consumer. Dead-code / unused-export enforcement for core
				// is handled by knip (`npm run lint:knip`, entry `core/index.ts!`).
				files: ["core/**/*.ts"],
				rules: ["deslop/unused-export"],
			},
			{
				// These are "use client" components; Next.js does not allow metadata
				// exports in client modules. Metadata is provided by the sibling
				// layout.tsx file in each route segment (App Router pattern).
				files: [
					"app/reputation/page.tsx",
					"app/client/accept/page.tsx",
					"app/create/page.tsx",
					"app/arbitration/[id]/page.tsx",
					"app/freelancer/review/page.tsx",
					"app/juror/page.tsx",
				],
				rules: ["react-doctor/nextjs-missing-metadata"],
			},
			{
				// Field.tsx intentionally exports its context and utility alongside the
				// Field component — compound-component pattern. Splitting them out would
				// add indirection with no meaningful benefit here.
				files: ["components/Field.tsx"],
				rules: ["react-doctor/only-export-components"],
			},
			{
				// The fetch here is a fire-and-forget POST (send magic-link email)
				// after a successful on-chain transaction — not data fetching for
				// display. Both fetch-in-effect rules are false positives.
				// Logic moved from page.tsx to useCreatePageState.ts in the hook extraction.
				files: ["app/create/page.tsx", "app/create/_lib/useCreatePageState.ts"],
				rules: [
					"react-doctor/no-fetch-in-effect",
					"react-doctor/nextjs-no-client-fetch-for-server-data",
				],
			},
			{
				// RoleContext reads localStorage in a mount effect intentionally.
				// The useState default must be "freelancer" on both server and client
				// to avoid React hydration error #418; the effect updates to the
				// stored value post-hydration. useSyncExternalStore would also work
				// but is heavier for this simple use case.
				files: ["contexts/RoleContext.tsx"],
				rules: ["react-doctor/no-initialize-state"],
			},
			{
				// global-error.tsx is the root error boundary: Next.js renders it
				// *outside* the locale layout, so globals.scss is not loaded and the
				// i18n provider is unavailable. Inline styles are therefore the only
				// reliable styling (Tailwind/CSS classes have no stylesheet), and the
				// recovery link uses a plain <a> to force a full document reload — the
				// correct way to escape a crashed root rather than re-running the
				// client navigation that just failed. Both rules are unavoidable here.
				files: ["app/global-error.tsx"],
				rules: [
					"react-doctor/nextjs-no-a-element",
					"react-doctor/no-inline-exhaustive-style",
				],
			},
			{
				// findDeploymentBlock performs a dependent binary search over chain
				// history. Each midpoint depends on the previous getCode result, so
				// Promise.all would change the algorithm rather than improve it.
				files: ["app/[locale]/reputation/_components/ReputationPageInner.tsx"],
				rules: ["react-doctor/async-await-in-loop"],
			},
			{
				// The core/ai and lib/db layers are deliberate Phase 4 scaffolding:
				// a provider-agnostic AI core and off-chain database repositories that
				// exist ahead of their call sites (feature-flagged, wired in later).
				// Each is reachable through its barrel (core/ai/index.ts, lib/db/index.ts);
				// dead-code enforcement is handled by knip (`npm run lint:knip`, which
				// treats those barrels as entries), so the unused-file heuristic is a
				// false positive here.
				files: ["core/ai/**/*.ts", "lib/db/**/*.ts"],
				rules: ["deslop/unused-file"],
			},
			{
				// The streaming providers read a Server-Sent Events response chunk by
				// chunk; each `reader.read()` must await the previous chunk, so the loop
				// is inherently sequential and Promise.all does not apply. Same pattern
				// in both the OpenAI-compatible and Gemini adapters.
				files: ["core/ai/providers/openaiCompatible.ts", "core/ai/providers/gemini.ts"],
				rules: ["react-doctor/async-await-in-loop"],
			},
			{
				// `pg` is the PostgreSQL driver that `@prisma/adapter-pg` runs on. We
				// construct the adapter from a connection string (see lib/db/client.ts)
				// rather than importing `pg` directly, but it is still the runtime
				// driver and is listed explicitly per Prisma's driver-adapter setup, so
				// the unused-dependency heuristic is a false positive.
				files: ["package.json"],
				rules: ["deslop/unused-dependency"],
			},
			{
				// The lib/db repositories are a deliberate data-access barrel: every
				// function is re-exported through lib/db/index.ts and consumed by API
				// routes/services via that barrel (which this per-file heuristic does not
				// credit as a consumer). Real dead-code enforcement is handled by knip
				// (`npm run lint:knip`, entry lib/db/index.ts), exactly as for core/**.
				files: ["lib/db/repositories/**/*.ts"],
				rules: ["deslop/unused-export"],
			},
			{
				// The document preview embeds a client-side object URL produced by
				// decrypting the contract file in the browser. next/image cannot
				// optimize a runtime blob: URL of unknown dimensions, so a plain <img>
				// is the correct element here (same rationale as the download path).
				files: ["components/DecryptDocumentForm.tsx"],
				rules: ["react-doctor/nextjs-no-img-element"],
			},
			{
				// This suite seeds a foreign `someOtherApp:token` localStorage key as a
				// fixture to assert the personal-data export never reads keys it does not
				// own. The literal is test data, not an app-persisted auth token.
				files: ["tests/unit/personal-data.test.ts"],
				rules: ["react-doctor/auth-token-in-web-storage"],
			},
		],
	},
};

export default config;
