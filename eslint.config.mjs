// eslint.config.mjs - ESLint 9 flat config, type-aware, maximum strictness
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
			"contracts/lib/**",
			"contracts/out/**",
			"contracts/cache/**",
			"contracts/broadcast/**",
			".venv-docs/**",
			"site/**",
			"src/**",
			"*.config.cjs",
			"scripts/**/*.js",
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
				// src/ is excluded from ESLint. All linted files (test/, scripts/,
				// hardhat.config.ts) are covered by tsconfig.hardhat.json.
				project: ["./tsconfig.hardhat.json"],
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

	// ── Absolute-max additions (flag stale disables + remaining type-aware rules) ──
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
			"@typescript-eslint/consistent-type-definitions": ["error", "interface"],
			"no-else-return": ["error", { allowElseIf: false }],
			"no-lonely-if": "error",
			"prefer-arrow-callback": "error",
			"radix": ["error", "always"],
			"yoda": ["error", "never"],
			"no-console": "error",
		},
	},

	// ── Per-file overrides ────────────────────────────────────────────────────
	{
		// Mocha/Chai callbacks are anonymous and use property-getter assertions
		// (e.g. `.to.be.properAddress`) that strict rules flag as violations.
		// Hardhat/ethers contract interactions return untyped `any` from typechain,
		// so the unsafe-* rules cannot be satisfied without full typechain codegen.
		files: ["test/**/*.ts"],
		rules: {
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			// Mocha relies on `function () {}` callbacks for its `this` context
			// (this.timeout(), this.skip()); arrow callbacks would break that.
			"prefer-arrow-callback": "off",
			// Hardhat ethers contract proxies are dynamically typed at runtime.
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/restrict-plus-operands": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
		},
	},
	{
		// Deployment and demo scripts use console.log for progress output and
		// call Hardhat/ethers contract methods that are dynamically typed.
		files: ["scripts/**/*.ts"],
		rules: {
			"no-console": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"@typescript-eslint/restrict-plus-operands": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
		},
	},
	{
		// Root JavaScript/MJS config files are linted by the root config, but they
		// are intentionally not part of tsconfig.hardhat.json. Keep them on core JS
		// rules so config/tool sweeps do not hit a type-aware parser project error.
		files: ["*.config.js", "eslint*.config.mjs", "tools/**/*.mjs"],
		languageOptions: {
			sourceType: "module",
			parserOptions: {
				project: false,
			},
			globals: {
				Buffer: "readonly",
				module: "readonly",
				process: "readonly",
				URL: "readonly",
			},
		},
		rules: {
			...tseslint.configs.disableTypeChecked.rules,
			"@typescript-eslint/await-thenable": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/consistent-type-exports": "off",
			"@typescript-eslint/consistent-type-imports": "off",
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/explicit-member-accessibility": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/method-signature-style": "off",
			"@typescript-eslint/no-confusing-void-expression": "off",
			"@typescript-eslint/no-deprecated": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-import-type-side-effects": "off",
			"@typescript-eslint/no-meaningless-void-operator": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-shadow": "off",
			"@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
			"@typescript-eslint/no-unnecessary-condition": "off",
			"@typescript-eslint/no-unnecessary-template-expression": "off",
			"@typescript-eslint/no-unnecessary-type-arguments": "off",
			"@typescript-eslint/no-unnecessary-type-parameters": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/prefer-find": "off",
			"@typescript-eslint/prefer-includes": "off",
			"@typescript-eslint/prefer-nullish-coalescing": "off",
			"@typescript-eslint/prefer-readonly": "off",
			"@typescript-eslint/prefer-reduce-type-parameter": "off",
			"@typescript-eslint/prefer-string-starts-ends-with": "off",
			"@typescript-eslint/prefer-optional-chain": "off",
			"@typescript-eslint/promise-function-async": "off",
			"@typescript-eslint/require-array-sort-compare": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/return-await": "off",
			"@typescript-eslint/strict-boolean-expressions": "off",
			"@typescript-eslint/switch-exhaustiveness-check": "off",
			"curly": ["error", "all"],
			"eqeqeq": ["error", "always"],
			"no-console": "error",
			"no-var": "error",
			"object-shorthand": ["error", "always"],
			"prefer-const": "error",
		},
	},
	// Must be last - turns off any rules that conflict with Prettier formatting.
	prettierConfig,
];
