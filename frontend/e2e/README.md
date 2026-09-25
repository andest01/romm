# End-to-end tests (Playwright)

The real app, in a real browser, against a real backend. Use these for behaviour that only shows up once everything is assembled; Vitest covers components in isolation.

## Run it

From `frontend/`, with a backend running that has games in its library:

```bash
cp e2e/.env.example e2e/.env   # works as-is against a local seeded backend
npm run test:e2e
```

If your setup differs from the defaults, a few values in `e2e/.env` are the ones to change. `E2E_ADMIN_USERNAME` and `E2E_ADMIN_PASSWORD` name an admin account, and `E2E_VIEWER_USERNAME` and `E2E_VIEWER_PASSWORD` name a non-admin one; both must already exist on the backend you test against. `E2E_DEV_PORT` is the port your local backend listens on (5000 unless you changed `DEV_PORT`). To test a remote backend instead, comment that out and set `E2E_DEV_PROXY_TARGET` to its URL. If anything is missing or malformed, the run stops right away and tells you what to fix.

On a throwaway local backend, create the two test accounts once, from the repo root:

```bash
uv run python .github/scripts/seed_e2e_users.py
```

Install the recommended VS Code extension, **Playwright Test for VS Code**. Most recipes below start from its panel in the Testing sidebar.

## Recipes

### Write a new test by clicking

Create the file, leave the cursor inside the test, and click **Record at cursor** in the Playwright panel:

```ts
// e2e/favorite-a-game.spec.ts
import { STORAGE_STATE } from "./fixtures/auth";
import { expect, test } from "./fixtures/test";

test.use({ storageState: STORAGE_STATE.admin });

test("favorites a game", async ({ page }) => {
  await page.goto("/");
  // cursor here
});
```

A browser opens, already signed in, and every click is written into the file. Use the recorder's assert buttons for what should be true afterwards. Then replace any `nth()` or CSS-path selectors with roles and labels.

### Watch a test run

Tick **Show browser** in the Playwright panel and run any test. From a terminal:

```bash
npm run test:e2e:headed
```

### Find out why a test failed

```bash
npm run test:e2e:ui
```

Click a step to see the page as it was at that moment, with its network and console. For the last run's failures, including traces:

```bash
npm run test:e2e:report
```

For a CI failure, download the `playwright-report` artifact from the workflow run, then open it the same way.

### Stop on a line

Set a breakpoint, right-click the test's gutter arrow, and choose **Debug Test**. Timeouts switch off while a debugger is attached, so take your time.

### Poke at the page mid-test

```ts
await page.pause();
```

```bash
npm run test:e2e:debug -- e2e/rom-actions.spec.ts
```

The Inspector lets you step one action at a time, try locators live, and record more steps. ESLint refuses a committed `page.pause()`.

### Find a selector

**Pick locator** in the Playwright panel, then click the element. The locator is copied for you.

### Debug the Vue app itself

Run headed, press F12 in the test browser, and put `debugger;` in any `.vue` file. It pauses there, with the real source files.

### Test as the viewer

```ts
test.use({ storageState: STORAGE_STATE.viewer });
```

Need the credentials themselves? Take them from the test arguments:

```ts
test("rejects a wrong password", async ({ page, e2eEnv }) => {
  const { username } = accountFor(e2eEnv, "viewer");
  // ...
});
```

### Test on a phone, tablet or handheld

The suite knows six target devices: RomM phone, tablet and desktop sizes, the Steam Deck, and both AYN Thor screens. The handhelds start in gamepad mode, as they would with their built-in controls.

**1. Run a test on every device.** Add the tag:

```ts
test("opens the game page", { tag: "@devices" }, async ({ page }) => {
  await gotoFirstRom(page);
  await expect(
    page.getByRole("button", { name: "More actions" }).first(),
  ).toBeVisible();
});
```

It now runs seven times: once on desktop Chrome as usual, and once per device.

**2. Run one device.**

```bash
npm run test:e2e -- --project="steam*"
npm run test:e2e -- --project="*gamepad*" e2e/devices.spec.ts
```

**3. Watch a device in VS Code.** In the Playwright panel, tick the device's project (for example "AYN Thor top screen (touch, gamepad)"), tick **Show browser**, and run the test. The browser opens at that device's size.

**4. Test something only handhelds do.** Take `gamepad` from the test arguments and skip elsewhere:

```ts
test(
  "shows focus rings on a handheld",
  { tag: "@devices" },
  async ({ page, gamepad }) => {
    test.skip(!gamepad, "Only devices with built-in game controls.");
    await gotoHydrated(page, "/");
    await expect(page.locator("html")).toHaveAttribute("data-input", "pad");
  },
);
```

How the devices are defined, what the virtual gamepad can and can't do, and how to add a device: [DEVICES.md](DEVICES.md).

### Run one file, or one test

```bash
npm run test:e2e -- e2e/login.spec.ts
npm run test:e2e -- -g "rejects a wrong password"
```

### Test against another backend

In `e2e/.env`, swap the local port for the remote URL, and use accounts that exist there:

```ini
# E2E_DEV_PORT=5000
E2E_DEV_PROXY_TARGET=https://romm.example.com
```

Never run the seed script against a real server; it resets those accounts' passwords.

### Sign in again

Sessions are saved in `e2e/.auth/` after the first run and reused, so tests start signed in straight away. Each run first checks that a saved session still signs the right account in; one that doesn't (expired, another backend, another account) is replaced by a fresh sign-in automatically. To force a fresh sign-in anyway, delete the folder:

```bash
rm -r e2e/.auth    # PowerShell: Remove-Item -Recurse e2e/.auth
```

### Let an agent write a test

Playwright's test agents run in Claude Code through this suite: its server, its `e2e/.env`, its saved sessions. Describe what you want, one step at a time:

> Use the playwright-test-planner to plan tests for favoriting a game as the viewer. Save the plan to e2e/specs/favorites.md.

Read the plan in `e2e/specs/` and fix it if needed, then:

> Use the playwright-test-generator to write the tests in e2e/specs/favorites.md.

Run what it wrote. If something fails:

> Use the playwright-test-healer on e2e/favorites.spec.ts.

The first time, Claude Code asks you to enable the project's `playwright-test` MCP server. It runs headless; delete `--headless` from `.mcp.json` locally to watch.

### Let an agent look at the app, cheaply

For "go check this page" rather than "write a test", Claude uses the `playwright-cli` skill. It drives a browser with shell commands and costs a fraction of the tokens the MCP agents do. It runs against your own dev server, not the suite's:

```bash
npm run dev    # in another terminal
```

> Use playwright-cli to open http://127.0.0.1:3000, sign in with the saved admin session in e2e/.auth/admin.json, and check that the ⋯ menu on a game offers Delete.

By hand, the same thing looks like:

```bash
npx playwright-cli open http://127.0.0.1:3000
npx playwright-cli state-load e2e/.auth/admin.json
npx playwright-cli reload
npx playwright-cli snapshot
```

The saved session comes from the suite's last run. Its cookie signs you in to the same backend. Its UI settings (v2, dark theme) belong to the suite's own port, so on your dev server you get your usual ones. Output goes to `.playwright-cli/`, which is gitignored.

## How it's wired

- **`e2e/.env`:** required locally, and the only source of `E2E_*` variables. It's validated before anything starts, and one error lists every problem. CI sets the same variables in `.github/workflows/e2e.yml`.
- **Server:** the suite starts its own on port 3100. That's the dev server locally, and a static build in CI.
- **Sign-in:** `auth.setup.ts` logs each account in once and saves the session to `e2e/.auth/` (gitignored). Later runs reuse it while it's still valid, and sign in again when it isn't. `login.spec.ts` is the only spec that drives the login form.
- **Timeouts:** 10s per test, so failures are fast. They switch off while debugging.
- **App errors:** if an `/api` call returns 5xx or the app throws, the test fails immediately and names the request (for example `GET /api/roms returned 500`), instead of timing out on an element.
- **Checks:**
  - types: `npm run typecheck:e2e` for the specs, `npm run typecheck:scripts` for `playwright.config.ts`
  - lint rules: `eslint.e2e.config.js`
- **Changing the suite itself:** see [CLAUDE.md](CLAUDE.md) for the rules.
