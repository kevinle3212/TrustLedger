// eslint.config.mjs — ESLint 9 flat config, type-aware, maximum strictness
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		ignores: [
			"dist/**",
			"build/**",
			"coverage/**",
			"node_modules/**",
			"artifacts/**",
			"hardhat-cache/**",
			"eslint.config.mjs",
			"*.config.js",
			"*.config.cjs",
			".tsbuildinfo",
		],
	},

	// Base recommended sets
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,

	{
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			parserOptions: {
				// Explicit list covers both tsconfigs: tsconfig.json (src/) and
				// tsconfig.hardhat.json (hardhat.config.ts, scripts/, test/).
				// projectService auto-discovery skips non-standard tsconfig names.
				project: ["./tsconfig.json", "./tsconfig.hardhat.json"],
				tsconfigRootDir: import.meta.dirname,
			},
		},

		rules: {
			/* ── Type safety (stricter than strict-type-checked defaults) ──── */
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

			/* ── Explicit boundaries ───────────────────────────────────────── */
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{
					allowExpressions: false,
					allowTypedFunctionExpressions: false,
					allowHigherOrderFunctions: false,
					allowDirectConstAssertionInArrowFunctions: false,
				},
			],
			"@typescript-eslint/explicit-module-boundary-types": "error",
			"@typescript-eslint/explicit-member-accessibility": "error",

			/* ── Imports / exports ─────────────────────────────────────────── */
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ prefer: "type-imports", fixStyle: "inline-type-imports" },
			],
			"@typescript-eslint/consistent-type-exports": "error",
			"no-duplicate-imports": "error",

			/* ── Async correctness (matters a lot for blockchain RPC code) ─── */
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/promise-function-async": "error",
			"@typescript-eslint/require-await": "error",
			"@typescript-eslint/return-await": ["error", "always"],
			"@typescript-eslint/await-thenable": "error",
			"@typescript-eslint/no-confusing-void-expression": "error",
			"@typescript-eslint/no-meaningless-void-operator": "error",

			/* ── Immutability ──────────────────────────────────────────────── */
			"@typescript-eslint/prefer-readonly": "error",
			"prefer-const": "error",
			"no-var": "error",
			"no-param-reassign": ["error", { props: true }],

			/* ── Naming / shape ────────────────────────────────────────────── */
			"@typescript-eslint/no-shadow": "error",
			"@typescript-eslint/naming-convention": [
				"error",
				{ selector: "variableLike", format: ["camelCase", "UPPER_CASE", "PascalCase"] },
				{ selector: "typeLike", format: ["PascalCase"] },
				{ selector: "enumMember", format: ["PascalCase", "UPPER_CASE"] },
			],

			/* ── Correctness / safety ──────────────────────────────────────── */
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

	// ── Per-file overrides ────────────────────────────────────────────────────
	{
		// Mocha/Chai callbacks are anonymous and use property-getter assertions
		// (e.g. `.to.be.properAddress`) that strict rules flag as violations.
		files: ["test/**/*.ts"],
		rules: {
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-unused-expressions": "off",
		},
	},
	{
		// Deployment scripts intentionally use console.log for progress output.
		files: ["scripts/**/*.ts"],
		rules: {
			"no-console": "off",
		},
	},

	// Must be last — turns off any rules that conflict with Prettier formatting.
	prettierConfig,
];
