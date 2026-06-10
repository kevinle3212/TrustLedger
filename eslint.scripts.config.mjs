import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";

export default [
	js.configs.recommended,
	{
		files: ["scripts/**/*.js"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			globals: {
				console: "readonly",
				process: "readonly",
			},
		},
		rules: {
			"curly": ["error", "all"],
			"eqeqeq": ["error", "always"],
			"no-console": ["error", { allow: ["error", "warn", "log"] }],
			"no-var": "error",
			"object-shorthand": ["error", "always"],
			"prefer-const": "error",
		},
	},
	{
		files: [
			"tools/ensure-doc-navigation.mjs",
			"tools/check-sensitive-files.mjs",
			"tools/hardhat-local-cache.mjs",
		],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			globals: {
				console: "readonly",
				process: "readonly",
			},
		},
		rules: {
			"curly": ["error", "all"],
			"eqeqeq": ["error", "always"],
			"no-console": ["error", { allow: ["error", "warn", "log"] }],
			"no-var": "error",
			"object-shorthand": ["error", "always"],
			"prefer-const": "error",
		},
	},
	prettierConfig,
];
