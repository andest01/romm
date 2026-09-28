import { test as base, expect, type Page } from "@playwright/test";
import { type E2EEnv, readE2EEnv } from "../e2e-environment";
import { useLocale } from "./i18n";

// Browser noise that isn't an app failure.
const BENIGN_PAGE_ERRORS = [/ResizeObserver loop/];

/** Call `onError` with a message naming each /api 5xx or uncaught error. */
export function watchAppErrors(page: Page, onError: (message: string) => void) {
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/") && response.status() >= 500) {
      const method = response.request().method();
      onError(`${method} ${url.pathname} returned ${response.status()}`);
    }
  });
  page.on("pageerror", (error) => {
    if (BENIGN_PAGE_ERRORS.some((re) => re.test(error.message))) return;
    onError(`Uncaught error in the app: ${error.message}`);
  });
}

/** Options a project or `test.use()` can set. */
export interface E2EOptions {
  /** Opt-out for a test that causes app errors on purpose. */
  failOnAppErrors: boolean;
  /** Emulate a device with built-in game controls (Steam Deck, AYN Thor). */
  gamepad: boolean;
}

interface AutoFixtures {
  appErrorGuard: void;
  virtualGamepad: void;
}

/** Worker options a project or the config can set. */
export interface E2EWorkerOptions {
  /** The app's language for this run; locators read its text via t(). */
  appLocale: string;
}

interface WorkerFixtures extends E2EWorkerOptions {
  e2eEnv: E2EEnv;
  localeLoaded: void;
}

/** `test` with the validated environment as `e2eEnv`, a guard that fails any
 *  test the moment the app itself fails, and an optional virtual gamepad. */
export const test = base.extend<E2EOptions & AutoFixtures, WorkerFixtures>({
  failOnAppErrors: [true, { option: true }],
  gamepad: [false, { option: true }],

  // One connected, idle, standard-mapping pad. useGamepad finds it on install
  // and switches the UI to gamepad modality, as on a handheld.
  virtualGamepad: [
    async ({ page, gamepad }, use) => {
      if (gamepad) {
        await page.addInitScript(() => {
          const pad = {
            id: "e2e virtual gamepad (STANDARD GAMEPAD)",
            index: 0,
            connected: true,
            mapping: "standard",
            timestamp: 0,
            axes: [0, 0, 0, 0],
            buttons: Array.from({ length: 17 }, () => ({
              pressed: false,
              touched: false,
              value: 0,
            })),
          };
          Object.defineProperty(navigator, "getGamepads", {
            value: () => [pad, null, null, null],
          });
        });
      }
      await use();
    },
    { auto: true },
  ],

  // An /api 5xx or an uncaught exception otherwise surfaces as a locator
  // timeout later, blaming an element. Closing the page fails the wait at once.
  appErrorGuard: [
    async ({ page, failOnAppErrors }, use) => {
      if (!failOnAppErrors) {
        await use();
        return;
      }
      const errors: string[] = [];
      watchAppErrors(page, (message) => {
        errors.push(message);
        void page.close();
      });

      await use();

      expect(errors, "The app failed while this test ran").toEqual([]);
    },
    { auto: true },
  ],

  appLocale: ["en_US", { option: true, scope: "worker" }],
  localeLoaded: [
    async ({ appLocale }, use) => {
      useLocale(appLocale);
      await use();
    },
    { scope: "worker", auto: true },
  ],

  e2eEnv: [
    // Playwright requires a destructured first argument, even when empty.
    async ({}, use) => {
      await use(readE2EEnv());
    },
    { scope: "worker" },
  ],
});

export { expect };
