import nextJest from "next/jest.js";
import type { Config } from "jest";

const createJestConfig = nextJest({
	dir: "./",
});

const config: Config = {
	coverageProvider: "v8",
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
	testEnvironment: "jest-environment-jsdom",
	testMatch: ["<rootDir>/tests/unit/**/*.test.{ts,tsx}"],
};

export default createJestConfig(config);
