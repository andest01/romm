// The devices v2 is built for: one per useBreakpoint tier plus the target
// handhelds. Single home for Storybook's viewport toolbar
// (.storybook/rommViewports.ts) and the Playwright device projects
// (playwright.config.ts).
export interface RommDevice {
  label: string;
  width: number;
  height: number;
  /** Storybook's toolbar icon; `mobile` also means a phone-style browser. */
  type: "mobile" | "tablet" | "desktop" | "other";
  touch: boolean;
  /** Has built-in game controls, so the UI should start in gamepad modality. */
  gamepad: boolean;
}

export const ROMM_DEVICES = {
  rommPhoneXs: {
    label: "390×844 · RomM phone (xs)",
    width: 390,
    height: 844,
    type: "mobile",
    touch: true,
    gamepad: false,
  },
  rommTabletSm: {
    label: "768×1024 · RomM tablet (sm)",
    width: 768,
    height: 1024,
    type: "tablet",
    touch: true,
    gamepad: false,
  },
  rommDesktopMd: {
    label: "1024×768 · RomM desktop (md)",
    width: 1024,
    height: 768,
    type: "desktop",
    touch: false,
    gamepad: false,
  },
  steamDeck: {
    label: "1280×800 · Steam Deck (lg, landscape)",
    width: 1280,
    height: 800,
    type: "other",
    touch: true,
    gamepad: true,
  },
  aynThorTop: {
    label: "1920×1080 · AYN Thor top screen (xl, landscape)",
    width: 1920,
    height: 1080,
    type: "other",
    touch: true,
    gamepad: true,
  },
  aynThorBottom: {
    label: "1240×1080 · AYN Thor bottom screen (md, landscape)",
    width: 1240,
    height: 1080,
    type: "other",
    touch: true,
    gamepad: true,
  },
} as const satisfies Record<string, RommDevice>;
