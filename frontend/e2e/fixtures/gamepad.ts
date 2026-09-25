import type { Page } from "@playwright/test";
import { PAD_BUTTON } from "../../src/v2/composables/useGamepad/padButtons";

export type PadButton = keyof typeof PAD_BUTTON;

declare global {
  interface Window {
    /** Installed by the `virtualGamepad` fixture when `gamepad` is on. */
    __e2eGamepad: { press(index: number): Promise<void> };
  }
}

/** Press and release one button on the virtual pad (needs `gamepad: true`).
 *  Not a trusted input, so the app stays in gamepad modality, as with a real
 *  controller; `page.keyboard` would switch it to keyboard modality. */
export async function pressPad(page: Page, button: PadButton) {
  await page.evaluate(
    (index) => window.__e2eGamepad.press(index),
    PAD_BUTTON[button],
  );
}
