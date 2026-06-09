import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";

export default [
	js.configs.recommended,
	{
		files: ["scripts/**/*.js"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "commonjs",
			globals: {
				__dirname: "readonly",
				console: "readonly",
				module: "readonly",
				process: "readonly",
				require: "readonly",
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
