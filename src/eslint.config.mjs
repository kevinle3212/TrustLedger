// eslint.config.mjs - ESLint 9 flat config, type-aware, maximum strictness for Next.js/React
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
	{
		ignores: [".next/**", "out/**", "next-env.d.ts", "postcss.config.mjs", "eslint.config.mjs"],
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
