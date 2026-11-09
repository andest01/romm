import type { ArgTypes } from "@storybook/vue3-vite";
import {
  DEFAULT_CRUISE,
  MARK_CURVES,
  type MarkCurve,
  type ScrollFeel,
} from "../list.props";

/** A ScrollFeel as flat story args, so each field is its own control. A part
 *  that's off (the stick) keeps its sliders' values for when it's on. */
export interface FeelArgs {
  bandRows: number;
  glideMs: number;
  cruiseEnterAt: number;
  cruiseExitAt: number;
  cruiseStackMs: number;
  cruiseFiveAt: number;
  cruiseTwoAt: number;
  marksLengthMs: number;
  marksFadeInShare: number;
  marksFadeInCurve: MarkCurve;
  marksFadeOutShare: number;
  marksFadeOutCurve: MarkCurve;
  hasStick: boolean;
  stickDeadzone: number;
  stickMinRowsPerSecond: number;
  stickMaxRowsPerSecond: number;
  stickGamma: number;
}

export const feelArgs = ({
  bandRows,
  glideMs,
  marks,
  stick,
}: ScrollFeel): FeelArgs => ({
  bandRows,
  glideMs,
  cruiseEnterAt: (stick ? stick.cruise : DEFAULT_CRUISE).enterAt,
  cruiseExitAt: (stick ? stick.cruise : DEFAULT_CRUISE).exitAt,
  cruiseStackMs: (stick ? stick.cruise : DEFAULT_CRUISE).stackMs,
  cruiseFiveAt: (stick ? stick.cruise : DEFAULT_CRUISE).fiveAt,
  cruiseTwoAt: (stick ? stick.cruise : DEFAULT_CRUISE).twoAt,
  marksLengthMs: marks.lengthMs,
  marksFadeInShare: marks.fadeIn.share,
  marksFadeInCurve: marks.fadeIn.curve,
  marksFadeOutShare: marks.fadeOut.share,
  marksFadeOutCurve: marks.fadeOut.curve,
  hasStick: stick !== null,
  stickDeadzone: stick ? stick.deadzone : 0.12,
  stickMinRowsPerSecond: stick ? stick.minRowsPerSecond : 0.5,
  stickMaxRowsPerSecond: stick ? stick.maxRowsPerSecond : 10,
  stickGamma: stick ? stick.gamma : 1,
});

export const feelFromArgs = (args: FeelArgs): ScrollFeel => ({
  bandRows: args.bandRows,
  glideMs: args.glideMs,
  marks: {
    lengthMs: args.marksLengthMs,
    fadeIn: { share: args.marksFadeInShare, curve: args.marksFadeInCurve },
    fadeOut: { share: args.marksFadeOutShare, curve: args.marksFadeOutCurve },
  },
  stick: args.hasStick
    ? {
        deadzone: args.stickDeadzone,
        minRowsPerSecond: args.stickMinRowsPerSecond,
        maxRowsPerSecond: args.stickMaxRowsPerSecond,
        gamma: args.stickGamma,
        cruise: {
          enterAt: args.cruiseEnterAt,
          exitAt: args.cruiseExitAt,
          stackMs: args.cruiseStackMs,
          fiveAt: args.cruiseFiveAt,
          twoAt: args.cruiseTwoAt,
        },
      }
    : null,
});

const CURVE_OPTIONS = Object.keys(MARK_CURVES);

export const FEEL_ARG_TYPES = {
  bandRows: { control: { type: "range", min: 1, max: 4, step: 1 } },
  glideMs: { control: { type: "range", min: 0, max: 400, step: 10 } },
  cruiseEnterAt: { control: { type: "range", min: 0.5, max: 1, step: 0.01 } },
  cruiseExitAt: { control: { type: "range", min: 0, max: 0.9, step: 0.01 } },
  cruiseStackMs: { control: { type: "range", min: 100, max: 3000, step: 50 } },
  cruiseFiveAt: { control: { type: "range", min: 0.5, max: 1, step: 0.01 } },
  cruiseTwoAt: { control: { type: "range", min: 0.4, max: 1, step: 0.01 } },
  marksLengthMs: { control: { type: "range", min: 0, max: 3000, step: 50 } },
  marksFadeInShare: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  marksFadeInCurve: { control: "select", options: CURVE_OPTIONS },
  marksFadeOutShare: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
  marksFadeOutCurve: { control: "select", options: CURVE_OPTIONS },
  hasStick: { control: "boolean" },
  stickDeadzone: { control: { type: "range", min: 0, max: 0.5, step: 0.01 } },
  stickMinRowsPerSecond: {
    control: { type: "range", min: 0, max: 10, step: 0.1 },
  },
  stickMaxRowsPerSecond: {
    control: { type: "range", min: 1, max: 60, step: 1 },
  },
  stickGamma: { control: { type: "range", min: 0.5, max: 3, step: 0.1 } },
} satisfies ArgTypes<FeelArgs>;
