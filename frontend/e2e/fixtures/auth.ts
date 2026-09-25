import type { Browser, Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import type { E2EEnv } from "../e2e-environment";
import { expect } from "./test";

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

/** A login failure that retrying can't fix, so `login()` stops at once. */
class LoginRejected extends Error {}

/** Whether a saved session still signs `username` in. Opens the app with it
 *  and sees what renders: that user's name in the app bar, or the login form
 *  (expired, or saved against another backend) or someone else's name. */
export async function isSessionValid(
  browser: Browser,
  {
    path,
    username,
    baseURL,
    timeout,
  }: { path: string; username: string; baseURL?: string; timeout: number },
): Promise<boolean> {
  const context = await browser
    .newContext({ baseURL, storageState: path, serviceWorkers: "block" })
    // An unreadable file is as good as no session.
    .catch(() => null);
  if (!context) return false;
  try {
    const page = await context.newPage();
    await page.goto("/");
    const userName = page.locator(".r-v2-user__name");
    await userName
      .or(page.locator("form.r-v2-login-form"))
      .first()
      .waitFor({ timeout });
    return (
      (await userName.isVisible()) &&
      (await userName.innerText()).trim() === username
    );
  } finally {
    await context.close();
  }
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
      const answered = page.waitForResponse(
        (r) =>
          r.url().includes("/api/login") && r.request().method() === "POST",
      );
      await fillLoginForm(page, username, password);
      // The backend's answer settles it in a second: a dead backend (the dev
      // proxy answers 5xx) or bad credentials won't be fixed by waiting.
      const response = await answered;
      if (response.status() >= 500) {
        throw new LoginRejected(
          `The backend isn't answering (POST /api/login returned ${response.status()}). Is it running where e2e/.env points (E2E_DEV_PORT or E2E_DEV_PROXY_TARGET)?`,
        );
      }
      if (!response.ok()) {
        throw new LoginRejected(
          `The backend rejected the ${username} account (POST /api/login returned ${response.status()}). Check its credentials in e2e/.env, and that it exists on that backend.`,
        );
      }
      // Assert a marker that only exists once authenticated (the app bar's user
      // name) rather than just "the URL is no longer /login" -- the latter goes
      // true mid-transition and says nothing about the session.
      await expect(page.locator(".r-v2-user__name")).toHaveText(username, {
        timeout,
      });
      await expect(page).not.toHaveURL(/\/login/);
      return;
    } catch (error) {
      if (error instanceof LoginRejected) throw error;
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
 *  out. Any status is accepted and then checked, so a 401/403 fails here with
 *  its cause instead of as a timeout. */
export async function gotoHydrated(page: Page, path: string) {
  // Hydration normally lands well under a second, so the config's short action
  // timeout is plenty; a long one would only eat the test's own budget.
  const hydrated = page.waitForResponse((r) =>
    r.url().includes("/api/permissions/me"),
  );
  await page.goto(path);
  const response = await hydrated;
  if (!response.ok()) {
    throw new Error(
      `Permissions didn't load (GET /api/permissions/me returned ${response.status()}), so every gated control would be hidden. The session most likely expired during the run: run again, and setup will sign in afresh (or delete e2e/.auth/ to force it).`,
    );
  }
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
