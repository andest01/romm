import type { Browser, Locator, Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import type { E2EEnv } from "../e2e-environment";
import { t, testLocale, tPattern } from "./i18n";
import { expect, watchAppErrors } from "./test";

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

/** Where auth.setup.ts saves each role's session (gitignored: live cookies). */
export const STORAGE_STATE: Record<Role, string> = {
  admin: fileURLToPath(new URL("../.auth/admin.json", import.meta.url)),
  viewer: fileURLToPath(new URL("../.auth/viewer.json", import.meta.url)),
};

/** The login form, found by its accessible name. */
export function loginForm(page: Page): Locator {
  return page.getByRole("form", { name: t("login.login") });
}

/** The app bar's account menu button: `username`'s, or anyone's. It only
 *  renders once signed in, so it also marks the app shell as ready. */
export function accountMenu(page: Page, username?: string): Locator {
  return page.getByRole("button", {
    name: username
      ? t("common.account-menu-for", { name: username })
      : tPattern("common.account-menu-for"),
    exact: !!username,
  });
}

/** Fill and submit the login form. */
export async function fillLoginForm(
  page: Page,
  username: string,
  password: string,
) {
  const form = loginForm(page);
  await form
    .getByRole("textbox", { name: t("login.username"), exact: true })
    .fill(username);
  // The show-password toggle's name contains this label, so match it exactly.
  await form.getByLabel(t("login.password"), { exact: true }).fill(password);
  await form
    .getByRole("button", { name: t("login.login"), exact: true })
    .click();
}

/** A login failure that retrying can't fix, so `login()` stops at once. */
class LoginRejected extends Error {}

/** Whether a saved session still signs `username` in, judged by what the app
 *  renders: that user's account menu, or the login form. */
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
    // The saved state may hold another locale; names are read in the test's.
    await seedUiState(page, "dark");
    // A separate context, so the test's app-error guard doesn't see this page.
    const errors: string[] = [];
    watchAppErrors(page, (message) => {
      errors.push(message);
      void page.close();
    });
    const anyAccount = accountMenu(page);
    try {
      await page.goto("/");
      await anyAccount.or(loginForm(page)).first().waitFor({ timeout });
    } catch (error) {
      if (!errors.length) throw error;
    }
    if (errors.length) {
      throw new Error(
        `The app failed while checking the saved session for ${username}: ${errors.join("; ")}`,
      );
    }
    return accountMenu(page, username).isVisible();
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
  // discovers a new dependency to pre-bundle.
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await page.goto("/login");
      const answered = page.waitForResponse(
        (r) =>
          r.url().includes("/api/login") && r.request().method() === "POST",
      );
      await fillLoginForm(page, username, password);
      // A dead backend or bad credentials won't be fixed by waiting.
      const response = await answered;
      if (response.status() >= 500) {
        throw new LoginRejected(
          `The backend isn't answering (POST /api/login returned ${response.status()}). Is it running at E2E_DEV_PROXY_TARGET?`,
        );
      }
      if (!response.ok()) {
        throw new LoginRejected(
          `The backend rejected the ${username} account (POST /api/login returned ${response.status()}). Check its credentials in e2e/.env, and that it exists on that backend.`,
        );
      }
      // The account menu only exists once authenticated; "the URL is no longer
      // /login" goes true mid-transition.
      await expect(accountMenu(page, username)).toBeVisible({ timeout });
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
  await accountMenu(page).click();
  await page.getByRole("menuitem", { name: t("common.profile") }).click();
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
 *  `useCan` reads grants from `/permissions/me` after mount, so until then even
 *  an admin sees every gated control hidden. The listener is armed before
 *  navigating, and any status is checked so a 401/403 fails with its cause.
 *  An expired session redirects to /login, which never requests permissions,
 *  so the login form is raced against the response. */
export async function gotoHydrated(page: Page, path: string) {
  const hydrated = page.waitForResponse((r) =>
    r.url().includes("/api/permissions/me"),
  );
  await page.goto(path);
  const loginShown = loginForm(page).waitFor();
  const response = await Promise.race([hydrated, loginShown.then(() => null)]);
  if (!response) {
    throw new Error(
      `Opened ${path} but landed on the login page: the saved session for this test has expired or was rejected. Run again, and setup signs in afresh (or delete e2e/.auth/).`,
    );
  }
  if (!response.ok()) {
    throw new Error(
      `Permissions didn't load (GET /api/permissions/me returned ${response.status()}). The session most likely expired: run again, or delete e2e/.auth/ to force a fresh sign-in.`,
    );
  }
  await expect(accountMenu(page)).toBeVisible();
}

/** Open the game page's ⋯ more-actions menu and return its panel. */
export async function openMoreMenu(page: Page) {
  await page
    .getByRole("group", { name: t("rom.game-actions") })
    .getByRole("button", { name: t("rom.more-actions") })
    .click();
  const panel = page.getByRole("menu");
  await expect(panel).toBeVisible();
  return panel;
}

/** Visible labels of every item in an open menu panel, in DOM order. */
export async function menuLabels(page: Page): Promise<string[]> {
  return page.getByRole("menu").getByRole("menuitem").allInnerTexts();
}

/** Force the v2 UI, a known theme and the test locale before the app boots. */
export async function seedUiState(page: Page, theme: "dark" | "light") {
  await page.addInitScript(
    ([uiTheme, locale]) => {
      localStorage.setItem("settings.uiVersion", "v2");
      localStorage.setItem("settings.theme", uiTheme);
      localStorage.setItem("settings.locale", locale);
    },
    [theme, testLocale()],
  );
}
