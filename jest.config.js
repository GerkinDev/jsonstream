/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.[tj]sx?$": [
      "ts-jest",
      {
        diagnostics: false, // { warnOnly: true },
        useESM: true,
      },
    ],
  },
  setupFilesAfterEnv: ["jest-extended/all"],
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
};
