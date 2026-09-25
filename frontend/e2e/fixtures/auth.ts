import { expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import type { E2EEnv } from "../e2e-environment";

export type Role = "admin" | "viewer";

export const ROLES = ["admin", "viewer"] as const satisfies readonly Role[];

export interface Account {
  username: string;
  password: string;
}

/** The account every permission assertion for `role` is made against. */
export function accountFor(env: E2EEnv, role: Role): Account {
  return role === "admin"
    ? { username: env.E2E_ADMIN_USERNAME, password: env.E2E_ADMIN_PASSWORD }
    : { username: env.E2E_VIEWER_USERNAME, password: env.E2E_VIEWER_PASSWORD };
}

/** Where auth.setup.ts parks each role's authenticated session: e2e/.auth/,
 *  whatever directory the run started from. Gitignored -- they hold live
 *  session cookies and are regenerated on every run. */
export const STORAGE_STATE: Record<Role, string> = {
  admin: fileURLToPath(new URL("../.auth/admin.json", import.meta.url)),
  viewer: fileURLToPath(new URL("../.auth/viewer.json", import.meta.url)),
};

/** Fill and submit the login form.
 *
 *  Everything is scoped to `form.r-v2-login-form`. The reset-password form is
 *  rendered alongside it (collapsed, not unmounted) and has its own submit
 *  button and fields, so unscoped `button[type="submit"]` / `input[name=...]`
 *  selectors match two elements and blow up on strict mode. */
export async function fillLoginForm(
  page: Page,
  username: string,
  password: string,
) {
  const form = page.locator("form.r-v2-login-form");
  await form.locator('input[name="username"]').fill(username);
  await form.locator('input[name="password"]').fill(password);
  await form.locator('button[type="submit"]').click();
}

/** Log in through the real form and wait for the app shell to take over. */
export async function login(
  page: Page,
  { username, password }: Account,
  { timeout, attempts }: { timeout: number; attempts: number },
) {
  // Retried because the Vite dev server force-reloads the page when it
  // discovers a new dependency to pre-bundle ("optimized dependencies changed.
  // reloading").
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await page.goto("/login");
      await fillLoginForm(page, username, password);
      // Assert a marker that only exists once authenticated (the app bar's user
      // name) rather than just "the URL is no longer /login" -- the latter goes
      // true mid-transition and says nothing about the session.
      await expect(page.locator(".r-v2-user__name")).toHaveText(username, {
        timeout,
      });
      await expect(page).not.toHaveURL(/\/login/);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Open the account menu and follow its Profile link (route `/user/:user`). */
export async function gotoOwnProfile(page: Page) {
  await gotoHydrated(page, "/");
  await page.locator("[data-user-menu-trigger]").click();
  await page.getByRole("menuitem", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/user\/\d+/);
}

/** Open the first platform on the platforms index, then its first game. */
export async function gotoFirstRom(page: Page) {
  await gotoHydrated(page, "/platforms");
  await page.locator('a[href^="/platform/"]').first().click();
  await page.locator('a.r-gc[href^="/rom/"]').first().click();
  await expect(page).toHaveURL(/\/rom\/\d+/);
}

/** `page.goto` that also waits for the permissions store to hydrate.
 *
 *  `useCan` reads a store hydrated from `/permissions/me` AFTER the app mounts,
 *  so until that response arrives even an admin has no grants and every gated
 *  control is hidden. Asserting before then reads the pre-hydration UI, which
 *  looks exactly like a permissions bug and is not one. Client-side navigation
 *  afterwards keeps the hydrated store.
 *
 *  The listener is armed BEFORE navigating, or the response can land first and
 *  the wait hangs until it times out. A full page load always starts with an
 *  empty store, so a missing response is a real failure, not something to wait
 *  out. */
export async function gotoHydrated(page: Page, path: string) {
  // Hydration normally lands well under a second, so the config's short action
  // timeout is plenty; a long one would only eat the test's own budget.
  const hydrated = page.waitForResponse(
    (r) => r.url().includes("/api/permissions/me") && r.status() === 200,
  );
  await page.goto(path);
  await hydrated;
  // The app bar's user name renders only once the auth store holds a user, so
  // it doubles as an "app shell is ready" signal. Without it, assertions can
  // run against a view still showing its loading skeleton -- which fails as a
  // missing element and reads like the element was removed on purpose.
  await expect(page.locator(".r-v2-user__name")).toBeVisible();
}

/** Open the ⋯ more-actions menu and return the teleported panel locator. */
export async function openMoreMenu(page: Page) {
  await page.getByRole("button", { name: "More actions" }).first().click();
  const panel = page.locator('[role="menu"]');
  await expect(panel).toBeVisible();
  return panel;
}

/** Visible labels of every item in an open menu panel, in DOM order. */
export async function menuLabels(page: Page): Promise<string[]> {
  return page.locator('[role="menu"] .r-menu-item__label').allInnerTexts();
}

/** Force the v2 UI and a known theme before the app boots. */
export async function seedUiState(page: Page, theme: "dark" | "light") {
  await page.addInitScript(
    ([t]) => {
      localStorage.setItem("settings.uiVersion", "v2");
      localStorage.setItem("settings.theme", t);
    },
    [theme],
  );
}
