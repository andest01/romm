// Short symbolic name → W3C standard-mapping button index, so a view can
// read raw pad state without memorising indices. Exhaustive over the standard
// 0..16 range; anything past that has no name. Vue-free, so the e2e suite's
// virtual gamepad can import it too.
export const PAD_BUTTON = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  lb: 4,
  rb: 5,
  lt: 6,
  rt: 7,
  back: 8,
  start: 9,
  l3: 10,
  r3: 11,
  "dpad-up": 12,
  "dpad-down": 13,
  "dpad-left": 14,
  "dpad-right": 15,
  home: 16,
} as const;
