// ESLint rules for the Playwright suite (e2e/ and playwright.config.ts).
//
// Tests deliberately break rules that make sense for app code, so every
// e2e-specific rule AND every exception to a base rule lives here, each with
// a one-line reason and the narrowest `files` glob that needs it. Spread into
// eslint.config.js after the base configs; exceptions come last so they win.
import playwright from "eslint-plugin-playwright";
import globals from "globals";

const E2E_FILES = ["e2e/**/*.ts", "playwright.config.ts"];
const TEST_FILES = ["e2e/**/*.ts"];

// The files that build the environment the tests receive as `e2eEnv`.
const ENV_BUILDERS = [
  "e2e/e2e-environment.ts",
  "e2e/fixtures/test.ts",
  "e2e/global-setup.ts",
];

export default [
  {
    name: "e2e/runtime",
    files: E2E_FILES,
    languageOptions: {
      // Specs and config run in Node, not the browser.
      globals: { ...globals.node },
    },
  },

  // Rules that only make sense for tests.
  {
    // Missing awaits, focused/skipped tests, page.pause(), fixed sleeps,
    // non-retrying assertions, and the rest of the plugin's recommended set.
    name: "e2e/playwright",
    ...playwright.configs["flat/recommended"],
    files: TEST_FILES,
  },
  {
    name: "e2e/rules",
    files: E2E_FILES,
    rules: {
      // An un-awaited expect() or action lets a test pass without checking
      // anything.
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    // Tests take the environment from the `e2eEnv` fixture, so the dependency
    // shows in their signature. Only the files that build it may import it.
    name: "e2e/environment",
    files: TEST_FILES,
    ignores: ENV_BUILDERS,
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "(^|/)e2e-environment(\\.ts)?$",
              allowTypeImports: true,
              message:
                "Take `e2eEnv` from the test arguments (`async ({ page, e2eEnv }) => ...`). Type-only imports are fine.",
            },
          ],
        },
      ],
    },
  },

  // Exceptions: rules that tests (or parts of the suite) legitimately break.
  {
    name: "e2e/exceptions/fixtures",
    files: E2E_FILES,
    rules: {
      // Playwright fixtures must destructure their first argument, even empty:
      // `async ({}, use) => ...`.
      "no-empty-pattern": "off",
    },
  },
  {
    name: "e2e/exceptions/setup",
    files: ["e2e/**/*.setup.ts"],
    rules: {
      // Setup is plumbing, not a test: it branches on CI for timeouts and
      // asserts through helpers such as login().
      "playwright/no-conditional-in-test": "off",
      "playwright/expect-expect": "off",
    },
  },
];
