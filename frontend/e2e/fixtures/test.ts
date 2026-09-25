import { test as base, expect } from "@playwright/test";
import { type E2EEnv, readE2EEnv } from "../e2e-environment";

// Browser noise that isn't an app failure.
const BENIGN_PAGE_ERRORS = [/ResizeObserver loop/];

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

/** `test` with the validated environment as a worker-scoped `e2eEnv` fixture,
 *  a guard that fails any test the moment the app itself fails, and an
 *  optional virtual gamepad. */
export const test = base.extend<E2EOptions & AutoFixtures, { e2eEnv: E2EEnv }>({
  failOnAppErrors: [true, { option: true }],
  gamepad: [false, { option: true }],

  // One connected, standard-mapping pad. useGamepad finds it when it installs
  // and switches the UI to gamepad modality (html[data-input="pad"]), as on a
  // handheld with built-in controls. `pressPad()` drives its buttons.
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
          const nextFrame = () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
          const setButton = (index: number, pressed: boolean) => {
            pad.buttons[index] = { pressed, touched: pressed, value: +pressed };
            pad.timestamp += 1;
          };
          Object.defineProperty(navigator, "getGamepads", {
            value: () => [pad, null, null, null],
          });
          window.__e2eGamepad = {
            // useGamepad polls once per animation frame and re-queues itself
            // before this callback, so holding for one frame means it sees
            // exactly one press edge at any frame rate (a visible window
            // behind other windows renders slowly) and never a held repeat.
            async press(index) {
              setButton(index, true);
              await nextFrame();
              setButton(index, false);
              await nextFrame();
            },
          };
        });
      }
      await use();
    },
    { auto: true },
  ],

  // An /api 5xx or an uncaught exception otherwise surfaces as a locator
  // timeout seconds later, blaming an element. Closing the page makes whatever
  // the test is waiting on fail at once; teardown then names the real cause.
  appErrorGuard: [
    async ({ page, failOnAppErrors }, use) => {
      if (!failOnAppErrors) {
        await use();
        return;
      }
      const errors: string[] = [];
      const fail = (message: string) => {
        errors.push(message);
        void page.close();
      };
      page.on("response", (response) => {
        const url = new URL(response.url());
        if (url.pathname.startsWith("/api/") && response.status() >= 500) {
          const method = response.request().method();
          fail(`${method} ${url.pathname} returned ${response.status()}`);
        }
      });
      page.on("pageerror", (error) => {
        if (BENIGN_PAGE_ERRORS.some((re) => re.test(error.message))) return;
        fail(`Uncaught error in the app: ${error.message}`);
      });

      await use();

      expect(errors, "The app failed while this test ran").toEqual([]);
    },
    { auto: true },
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
