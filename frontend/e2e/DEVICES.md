# Testing on target devices

v2 is built to work from a 390px phone to a 1920px handheld screen, with mouse, touch, keyboard or gamepad. The e2e suite can run any test on each target device, so a layout or input bug on the Steam Deck shows up as a failing test, not a bug report.

For the basics (tag a test, run one device), see the README's "Test on a phone, tablet or handheld" recipe. This page covers how it works.

## The devices

They're defined once, in [`src/v2/devices.ts`](../src/v2/devices.ts). Storybook's viewport toolbar and the Playwright device projects are both built from that file, so the two can't drift apart.

| Project name    | Size      | Breakpoint tier | Touch | Built-in controls |
| --------------- | --------- | --------------- | ----- | ----------------- |
| `rommPhoneXs`   | 390×844   | xs              | yes   | no                |
| `rommTabletSm`  | 768×1024  | sm              | yes   | no                |
| `rommDesktopMd` | 1024×768  | md              | no    | no                |
| `steamDeck`     | 1280×800  | lg              | yes   | yes               |
| `aynThorTop`    | 1920×1080 | xl              | yes   | yes               |
| `aynThorBottom` | 1240×1080 | md              | yes   | yes               |

The breakpoint tiers are `useBreakpoint`'s: `xs <600`, `sm 600–959`, `md 960–1279`, `lg 1280–1919`, `xl ≥1920`.

## How a device becomes a Playwright project

`playwright.config.ts` turns each device into a project named after its key. Each one:

- **Size:** takes the device's width and height as the browser viewport.
- **Touch:** turns on touch support when the device has a touchscreen, so `locator.tap()` works. Only the phone also gets a phone-style browser (`isMobile`).
- **Controls:** gets a virtual gamepad when the device has built-in controls (below).
- **Sessions:** depends on the `setup` project, so tests start signed in, just like on desktop.
- **Scope:** runs only tests tagged `@devices`.

The tag keeps the everyday run fast: an untagged test runs once, on desktop Chrome. A tagged test runs once there and once per device, seven times in all. Tag tests whose behaviour depends on screen size, touch or gamepad input; leave the rest untagged.

## The virtual gamepad

The app decides how you're interacting from the last input it saw, and mirrors that onto `<html data-input="…">`: `mouse`, `touch`, `key` or `pad`. Focus rings, autofocus and hover styles all key off that attribute.

On a real handheld, the built-in controls are a connected gamepad. When the signed-in app starts, `useGamepad` checks `navigator.getGamepads()`; if a pad is connected, it switches to `pad`. The `gamepad` option (in `fixtures/test.ts`) recreates exactly that: it puts one connected, idle, standard-mapping pad into the page before the app loads. The app goes through its real detection code; nothing in the app knows it's being tested.

What it does **not** do yet:

- **Press buttons.** The pad is idle. Driving navigation with it (D-pad, A/B) would need a helper that flips its button state, which doesn't exist yet.
- **Stay in `pad` mode through keyboard input.** Playwright's keyboard sends real key presses, which switch the app to `key` mode. Use `locator.click()`/`tap()` or assertions in pad mode, not `page.keyboard`, when the modality matters.
- **Cover the sign-in screen.** `useGamepad` is installed by the signed-in layout, so the login page stays in its default mode even on a handheld.

Use it in a test through the `gamepad` argument, which is `true` on the handheld projects:

```ts
test("...", { tag: "@devices" }, async ({ page, gamepad }) => {
  test.skip(!gamepad, "Only devices with built-in game controls.");
  // ...
});
```

Any single test or describe block can also turn it on by hand, whatever the project:

```ts
test.use({ gamepad: true });
```

## Running

```bash
npm run test:e2e -- --project=steamDeck                       # one device
npm run test:e2e -- --project=steamDeck --project=aynThorTop    # several
npm run test:e2e -- --grep @devices                             # every tagged test, every project
```

In VS Code, tick device projects in the Playwright panel of the Testing sidebar; with **Show browser** on, the browser opens at that device's size.

## Adding a device

Add an entry to `ROMM_DEVICES` in `src/v2/devices.ts`, with its label, size, Storybook icon type, and whether it has touch and built-in controls. It then appears in Storybook's viewport toolbar and as a Playwright project automatically. Nothing else needs to change.

## Limits

- **Chromium only.** Every device project runs in Chromium at a device pixel ratio of 1, with a desktop Chrome browser identity. It emulates each device's screen and inputs, not its browser.
- **Not real hardware.** Performance, the physical controls and the handhelds' own browsers aren't covered. Check those on the device itself before a release.
