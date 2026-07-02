import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";

export default [
	js.configs.recommended,
	{
		// All Node tooling/build scripts: root `scripts/` (.js + .mjs) and `tools/`
		// (.mjs). Kept on core JS rules with Node globals; these files are not part
		// of any tsconfig, so type-aware linting does not apply.
		files: ["scripts/**/*.js", "scripts/**/*.mjs", "tools/**/*.mjs"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			globals: {
				console: "readonly",
				process: "readonly",
				URL: "readonly",
			},
		},
		rules: {
			"curly": ["error", "all"],
			"eqeqeq": ["error", "always"],
			"no-console": ["error", { allow: ["error", "warn", "log"] }],
			"no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					// Destructuring to omit keys (`const { drop, ...rest } = obj`) is a
					// deliberate pattern here (e.g. stripping GIT_* from a child env).
					ignoreRestSiblings: true,
					caughtErrors: "all",
				},
			],
			"no-var": "error",
			"object-shorthand": ["error", "always"],
			"prefer-const": "error",
		},
	},
	prettierConfig,
];
