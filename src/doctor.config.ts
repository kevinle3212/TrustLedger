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
		],
	},
};

export default config;
