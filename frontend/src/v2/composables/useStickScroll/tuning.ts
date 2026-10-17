// Feel of the analog stick scroll. Persisted locally so a tuned range survives
// a reload.
import { useUserLocalStorage } from "@/composables/useUserLocalStorage";

export interface StickTuning {
  /** Stick deflection ignored below this (0 to 1). */
  deadzone: number;
  /** Rows per second at the edge of the deadzone. */
  minRows: number;
  /** Rows per second at full deflection. */
  maxRows: number;
  /** 1 = linear; above 1 eases the low end, below 1 lifts it. */
  gamma: number;
  /** Rows the view must move past a card before the selection switches. */
  deadBand: number;
}

export const STICK_DEFAULTS: StickTuning = {
  deadzone: 0.12,
  minRows: 0.5,
  maxRows: 10,
  gamma: 1,
  deadBand: 0.6,
};

export const stickTuning = useUserLocalStorage<StickTuning>(
  "settings.v2.stickTuning",
  { ...STICK_DEFAULTS },
  { mergeDefaults: true },
);
