// eslint.config.mjs - ESLint 9 flat config, type-aware, maximum strictness for Next.js/React
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Engine guard: this frontend config targets ESLint 9. eslint-plugin-react
// (pulled in via eslint-config-next) still calls the removed
// `context.getFilename()`, so an ESLint 10+ engine crashes with a cryptic
// "Error while loading rule 'react/display-name'". That happens on a bare
// `npx eslint src/...` from the repo root, whose contracts toolchain resolves
// ESLint 10 and then loads this file. Detect the running engine's major
// version (walk up from its CLI entry to the owning package.json) and fail
// fast with the fix. Fail open when the version cannot be determined so
// editor/API integrations are never blocked.
const runningEslintMajor = (() => {
	const cli = process.argv[1] ?? "";
	// argv[1] is usually the `.bin/eslint` symlink; resolve it to the real
	// bin path so the walk-up reaches the owning eslint package.
	let resolvedCli = cli;
	try {
		resolvedCli = realpathSync(cli);
	} catch {
		// Not a real path (e.g. API embedding) — fall back to argv as-is.
	}
	let dir = dirname(resolvedCli);
	for (let depth = 0; depth < 6; depth += 1) {
		const manifest = join(dir, "package.json");
		if (existsSync(manifest)) {
			try {
				const pkg = JSON.parse(readFileSync(manifest, "utf8"));
				if (pkg.name === "eslint") {
					return Number.parseInt(pkg.version, 10);
				}
			} catch {
				// Unreadable manifest — keep walking up.
			}
		}
		const parent = dirname(dir);
		if (parent === dir) {
			break;
		}
		dir = parent;
	}
	return null;
})();

if (runningEslintMajor !== null && runningEslintMajor >= 10) {
	throw new Error(
		`Frontend ESLint config requires ESLint 9 but was loaded by ESLint ${runningEslintMajor}. ` +
			"A bare `npx eslint` from the repo root uses the contracts ESLint 10, which crashes " +
			"on eslint-plugin-react. Run `npm run lint:frontend` from the repo root, or " +
			"`npm run lint:frontend:ts` from src/.",
	);
}

export default [
	{
		// `.mjs` files are plain ESM (config + build scripts like
		// `scripts/generate-codebase-stats.mjs`) and are not part of the
		// type-aware `tsconfig.json` project. Globbing every `.mjs` keeps the
		// typescript-eslint parser from throwing "file was not found in any of
		// the provided project(s)" on current and future scripts.
		ignores: [
			".next/**",
			"out/**",
			"next-env.d.ts",
			"**/*.mjs",
			// Prisma Client is generated code (see prisma/schema.prisma); never lint it.
			"lib/generated/**",
		],
	},

	// Next.js base: @next/next, react, react-hooks, jsx-a11y rules
	...nextVitals,
	...nextTs,

	// Base recommended sets
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,

	{
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},

		rules: {
			/* -- Type safety ---------------------------------------------------- */
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/no-unnecessary-condition": "error",
			"@typescript-eslint/strict-boolean-expressions": [
				"error",
				{
					allowString: false,
					allowNumber: false,
					allowNullableObject: false,
					allowNullableBoolean: false,
					allowNullableString: false,
					allowNullableNumber: false,
					allowAny: false,
				},
			],
			"@typescript-eslint/switch-exhaustiveness-check": "error",

			/* -- Explicit boundaries -------------------------------------------- */
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{
					allowExpressions: false,
					// Allows: const Foo: FC<Props> = () => <div /> (typed variable)
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: false,
					allowDirectConstAssertionInArrowFunctions: false,
				},
			],
			"@typescript-eslint/explicit-module-boundary-types": [
				"error",
				{ allowTypedFunctionExpressions: true },
			],
			"@typescript-eslint/explicit-member-accessibility": "error",

			/* -- Imports / exports ---------------------------------------------- */
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "inline-type-imports" },
			],
			"@typescript-eslint/consistent-type-exports": "error",
			"no-duplicate-imports": "error",

			/* -- Async correctness ---------------------------------------------- */
			"@typescript-eslint/no-floating-promises": "error",
			// attributes: false allows async JSX event handlers (onClick, onSubmit, etc.)
			"@typescript-eslint/no-misused-promises": [
				"error",
				{ checksVoidReturn: { attributes: false } },
			],
			"@typescript-eslint/promise-function-async": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/return-await": ["error", "always"],
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/no-confusing-void-expression": "error",
			"@typescript-eslint/no-meaningless-void-operator": "error",

			/* -- Immutability --------------------------------------------------- */
			"@typescript-eslint/prefer-readonly": "error",
			"prefer-const": "error",
			"no-var": "error",
			"no-param-reassign": ["error", { props: true }],

			/* -- Naming / shape ------------------------------------------------- */
			"@typescript-eslint/no-shadow": "error",
			"@typescript-eslint/naming-convention": [
				"error",
				{ selector: "variableLike", format: ["camelCase", "UPPER_CASE", "PascalCase"] },
				// Intentionally-unused bindings (e.g. a skipped callback/handler arg) may
				// carry a leading underscore, matching no-unused-vars' argsIgnorePattern.
				{
					selector: "variableLike",
					modifiers: ["unused"],
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
					leadingUnderscore: "allow",
				},
				{ selector: "typeLike", format: ["PascalCase"] },
				{ selector: "enumMember", format: ["PascalCase", "UPPER_CASE"] },
			],

			/* -- Correctness / safety ------------------------------------------- */
			"eqeqeq": ["error", "always", { null: "always" }],
			"curly": ["error", "all"],
			"no-eval": "error",
			"no-implied-eval": "error",
			"no-throw-literal": "error",
			"no-implicit-coercion": "error",
			"no-unneeded-ternary": "error",
			"prefer-template": "error",
			"object-shorthand": ["error", "always"],
			"no-console": "warn",
		},
	},

	// -- Absolute-max additions (flag stale disables + remaining type-aware rules) --
	{
		linterOptions: {
			// A disable comment that no longer suppresses anything is itself an error.
			reportUnusedDisableDirectives: "error",
		},
		rules: {
			"@typescript-eslint/no-unnecessary-type-parameters": "error",
			"@typescript-eslint/no-unnecessary-template-expression": "error",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
			"@typescript-eslint/no-unnecessary-type-arguments": "error",
			"@typescript-eslint/no-deprecated": "error",
			"@typescript-eslint/prefer-nullish-coalescing": "error",
			"@typescript-eslint/prefer-optional-chain": "error",
			"@typescript-eslint/prefer-find": "error",
			"@typescript-eslint/prefer-includes": "error",
			"@typescript-eslint/prefer-reduce-type-parameter": "error",
			"@typescript-eslint/prefer-string-starts-ends-with": "error",
			"@typescript-eslint/require-array-sort-compare": "error",
			"@typescript-eslint/method-signature-style": ["error", "property"],
			"@typescript-eslint/no-import-type-side-effects": "error",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrors: "all",
					ignoreRestSiblings: false,
				},
			],
			"no-else-return": ["error", { allowElseIf: false }],
			"no-lonely-if": "error",
			"prefer-arrow-callback": "error",
			"radix": ["error", "always"],
			"yoda": ["error", "never"],
			// console.error / console.warn are allowed for client-side diagnostics;
			// console.log is forbidden.
			"no-console": ["error", { allow: ["error", "warn"] }],
		},
	},

	// -- Per-file overrides ----------------------------------------------------
	{
		// App Router: generateMetadata, generateStaticParams, etc. are HOFs
		files: ["app/**/*.ts", "app/**/*.tsx"],
		rules: {
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{
					allowExpressions: false,
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
					allowDirectConstAssertionInArrowFunctions: false,
				},
			],
		},
	},

	// Must be last - disables any rules that conflict with Prettier formatting.
	prettierConfig,
];
