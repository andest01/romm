import { test as base } from "@playwright/test";
import { type E2EEnv, readE2EEnv } from "../e2e-environment";

/** `test` with the validated environment as a worker-scoped `e2eEnv` fixture. */
export const test = base.extend<object, { e2eEnv: E2EEnv }>({
  e2eEnv: [
    // Playwright requires a destructured first argument, even when empty.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use(readE2EEnv());
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
