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
		],
	},
};

export default config;
