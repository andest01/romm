// ESLint rules for the Playwright suite. Every e2e rule, and every exception to
// a base rule that tests legitimately break, lives here with a one-line reason.
import playwright from "eslint-plugin-playwright";
import globals from "globals";

const E2E_FILES = ["e2e/**/*.ts", "playwright.config.ts"];
const TEST_FILES = ["e2e/**/*.ts"];

// The files that build the environment the tests receive as `e2eEnv`.
const ENV_BUILDERS = ["e2e/e2e-environment.ts", "e2e/fixtures/test.ts"];

export default [
  {
    name: "e2e/runtime",
    files: E2E_FILES,
    languageOptions: {
      // Specs and config run in Node, not the browser.
      globals: { ...globals.node },
    },
  },
  {
    name: "e2e/type-info",
    files: TEST_FILES,
    languageOptions: {
      // Resolves to e2e/tsconfig.json, so the app's lint stays untyped.
      parserOptions: { projectService: true },
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
    name: "e2e/playwright-options",
    files: TEST_FILES,
    rules: {
      // A conditional skip fits a test to some projects; an unconditional one
      // is still flagged.
      "playwright/no-skipped-test": ["warn", { allowConditional: true }],
    },
  },
  {
    name: "e2e/rules",
    files: TEST_FILES,
    rules: {
      // An un-awaited expect() or action lets a test pass without checking.
      "@typescript-eslint/no-floating-promises": "error",
      // CSS selectors break on styling changes; find elements the way users
      // do. Each allowed selector has no role to find it by (yet).
      "playwright/no-raw-locators": [
        "error",
        {
          allowed: [
            // The input-modality attribute on <html>, a state, not an element.
            "html",
            // Any select's trigger: the ARIA contract, not a class.
            '[aria-haspopup="listbox"]',
            // No named list of platforms or games yet.
            'a[href^="/platform/"]',
            'a.r-gc[href^="/rom/"]',
          ],
        },
      ],
      // Locator text in one language fails in every other one.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^getBy(Text|Label|Placeholder|AltText|Title)$/][arguments.0.type=/^(Literal|TemplateLiteral)$/]",
          message:
            'Locator text must come from the app\'s locale files: getByText(t("ns.key")), from "./fixtures/i18n".',
        },
        {
          selector:
            "CallExpression[callee.property.name='getByRole'] > ObjectExpression > Property[key.name='name'][value.type=/^(Literal|TemplateLiteral)$/]",
          message:
            'An accessible name must come from the app\'s locale files: { name: t("ns.key") }, or tPattern() when it embeds data.',
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(locator|filter)$/] > ObjectExpression > Property[key.name=/^has(Not)?Text$/][value.type=/^(Literal|TemplateLiteral)$/]",
          message:
            'hasText must come from the app\'s locale files: { hasText: t("ns.key") }.',
        },
        {
          selector:
            "CallExpression[callee.property.name=/^(toHaveText|toContainText|toHaveAccessibleName|toHaveAccessibleDescription)$/][arguments.0.type='TemplateLiteral'], CallExpression[callee.property.name=/^(toHaveText|toContainText|toHaveAccessibleName|toHaveAccessibleDescription)$/][arguments.0.type='Literal']:not([arguments.0.regex])",
          message:
            'Expected text must come from the app\'s locale files: toHaveText(t("ns.key")). A regex is allowed for data, not UI text.',
        },
      ],
    },
  },
  {
    name: "e2e/imports",
    files: TEST_FILES,
    ignores: ENV_BUILDERS,
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          // The stock `test` has neither the app-error guard nor `e2eEnv`.
          paths: [
            {
              name: "@playwright/test",
              importNames: ["test", "expect"],
              allowTypeImports: true,
              message:
                'Import `test` and `expect` from "./fixtures/test" (or "./test" inside fixtures/), so the app-error guard and `e2eEnv` apply.',
            },
          ],
          // Tests take the environment from the `e2eEnv` fixture, so the
          // dependency shows in their signature.
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
    files: TEST_FILES,
    rules: {
      // Playwright fixtures must destructure their first argument, even empty.
      "no-empty-pattern": "off",
    },
  },
  {
    name: "e2e/exceptions/setup",
    files: ["e2e/**/*.setup.ts"],
    rules: {
      // Setup is plumbing: it branches on CI and on a saved session, and
      // asserts through helpers such as login().
      "playwright/no-conditional-in-test": "off",
      "playwright/expect-expect": "off",
    },
  },
];
