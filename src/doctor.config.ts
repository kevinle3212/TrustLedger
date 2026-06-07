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
		],
	},
};

export default config;
