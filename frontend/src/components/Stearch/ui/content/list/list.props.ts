import type { Component, ComponentPublicInstance } from "vue";
import type { ListSlot } from "../../../store/rows.selectors";
import type { ItemPart, ItemProps } from "./item.props";

/** The scroller methods a jump needs. */
export interface JumpScroller {
  scrollTop: number;
  containerEl: HTMLElement | null;
  scrollToIndex(index: number, options: { smooth: boolean }): void;
}

/** What Vue hands a function `ref`. */
export type ScrollerRef = Element | ComponentPublicInstance | null;

export type ListItemKind = "tile" | "phone-row" | "phone-cover" | "gallery-row";

/** One line of the scroller. `position` is the first result at or after it. */
export type ScrollRow =
  | {
      readonly kind: "head";
      readonly key: string;
      readonly position: number;
      readonly label: string;
    }
  | {
      readonly kind: "items";
      readonly key: string;
      readonly position: number;
      readonly slots: readonly ListSlot[];
    };

/** The visible span, in scroller rows. `last` is exclusive. */
export interface VisibleRange {
  first: number;
  last: number;
}

export interface ListProps {
  /** The view for each slot. */
  item: ItemPart;
  verbs: ItemProps["verbs"];
  setScroller: (scroller: ScrollerRef) => void;
  /** Floats over the top edge and names the current section. */
  band: Component | null;
  /** How far the next heading has pushed the band up, as a negative number. */
  bandOffset: number;
  /** Sits hard against the scrollbar's left edge, at full height. */
  rail: Component | null;
  /** The scrollbar's measured width, so the rail can sit beside it. */
  scrollbarWidth: number;
  columns: number;
  rowHeight: number;
  headHeight: number;
  /** Headings and item rows. Only visible rows reach the DOM. */
  rows: readonly ScrollRow[];
  /** The key-focused position, drawn with a ring; `null` before any key. */
  activePosition: number | null;
  /** The current game (`attention.activeId`), drawn with a bar; `null` when
   *  none, or when the ring sits on a ghost. */
  currentId: number | null;
  /** How the attention marks fade in and out (`marks.css`). */
  marks: MarkMotion;
  /** The grid's accessible name. */
  gridLabel: string;
  /** The active item's id, so a screen reader follows it. `null` when it
   *  isn't in the DOM. */
  activeDescendantId: string | null;
  /** How to move around, read once on arrival. */
  gridHelp: string;
  errorMessage: string | null;
  emptyMessage: string;
}

// Stub label: move to a locale key before this leaves the fork.
export const RESULTS_HELP =
  "Use the arrow keys or D-pad to move between games. Tab leaves the list.";
export const RESULTS_HELP_ID = "stearch-results-help";

/** Rows kept mounted beyond the viewport. Read-ahead already fetches data
 * ahead, so a wider ring only mounts tiles nobody sees. */
export const SCROLLER_OVERSCAN = 2;

/** How cruise is entered, stacked and left (spec 010). Pushes are 0 to 1. */
export interface CruiseTuning {
  /** The push that starts the count, and that must hold until the first stack. */
  readonly enterAt: number;
  /** Below this push, cruise ends. */
  readonly exitAt: number;
  /** Time to earn each stack: 1x, then 2x, then 5x. */
  readonly stackMs: number;
  /** A push at or above these allows 5x, then 2x. */
  readonly fiveAt: number;
  readonly twoAt: number;
}

export const DEFAULT_CRUISE: CruiseTuning = Object.freeze({
  enterAt: 0.95,
  exitAt: 0.4,
  stackMs: 1000,
  fiveAt: 0.9,
  twoAt: 0.75,
});

/** Easing curves for the attention marks, by name, so a story can pick one. */
export const MARK_CURVES = Object.freeze({
  linear: "linear",
  "ease-out-sine": "cubic-bezier(0.61, 1, 0.88, 1)",
  "ease-in-out-sine": "cubic-bezier(0.37, 0, 0.63, 1)",
  "ease-in-sine": "cubic-bezier(0.12, 0, 0.39, 0)",
  "ease-out-cubic": "cubic-bezier(0.33, 1, 0.68, 1)",
  "ease-out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
});
export type MarkCurve = keyof typeof MARK_CURVES;

/** One side of a mark's timeline. */
export interface MarkFade {
  /** Share of the timeline's length, 0 to 1. 0 is a jump cut. */
  readonly share: number;
  readonly curve: MarkCurve;
}

/** How the attention marks (selected, current, key position) appear and
 *  disappear. A fade in takes `lengthMs × fadeIn.share`, a fade out
 *  `lengthMs × fadeOut.share`. */
export interface MarkMotion {
  readonly lengthMs: number;
  readonly fadeIn: MarkFade;
  readonly fadeOut: MarkFade;
}

/** The analog stick as a scroll (spec 008): deflection sets a speed, the
 *  view leads and the current game catches up. */
export interface StickFeel {
  /** Stick travel ignored around the centre, 0 to 1. */
  readonly deadzone: number;
  /** Rows per second just past the deadzone. */
  readonly minRowsPerSecond: number;
  /** Rows per second at full push. */
  readonly maxRowsPerSecond: number;
  /** The curve between them: 1 is linear, above 1 is finer when slow. */
  readonly gamma: number;
  readonly cruise: CruiseTuning;
}

/** How a list moves (specs 007 and 008). One interface for every view, read
 *  by the same code; each view picks its values. */
export interface ScrollFeel {
  /** The centre band's height in whole rows. Keys keep the active row inside
   *  it, and under the stick the active row hands over when its middle
   *  leaves it, so every input keeps the active row in the band. */
  readonly bandRows: number;
  /** A tap's glide, in a straight line. 0 is a jump cut. */
  readonly glideMs: number;
  /** How the attention marks fade in and out. */
  readonly marks: MarkMotion;
  /** `null`: the stick sends arrow keys, like the D-pad. */
  readonly stick: StickFeel | null;
}

const JUMP_CUT_MARKS: MarkMotion = Object.freeze({
  lengthMs: 0,
  fadeIn: Object.freeze({ share: 0, curve: "linear" }),
  fadeOut: Object.freeze({ share: 0, curve: "linear" }),
});

/** The old gallery demo's values (`useStickScroll`, commit 2cbdb4352). */
const STICK: StickFeel = Object.freeze({
  deadzone: 0.12,
  minRowsPerSecond: 0.5,
  maxRowsPerSecond: 30,
  gamma: 1,
  cruise: DEFAULT_CRUISE,
});

/** The table: keys in jump cuts, the stick as a smooth scroll. */
export const TABLE_FEEL: ScrollFeel = Object.freeze({
  bandRows: 1,
  glideMs: 0,
  marks: JUMP_CUT_MARKS,
  stick: STICK,
});

/** Tiles: keys in jump cuts, the stick as a smooth scroll. */
export const TILES_FEEL: ScrollFeel = Object.freeze({
  bandRows: 1,
  glideMs: 0,
  marks: JUMP_CUT_MARKS,
  stick: STICK,
});

/** The CSS variables `marks.css` reads, from a mark timeline. */
export const markVariables = ({
  lengthMs,
  fadeIn,
  fadeOut,
}: MarkMotion): Record<string, string> => ({
  "--stearch-mark-in-ms": `${lengthMs * fadeIn.share}ms`,
  "--stearch-mark-in-curve": MARK_CURVES[fadeIn.curve],
  "--stearch-mark-out-ms": `${lengthMs * fadeOut.share}ms`,
  "--stearch-mark-out-curve": MARK_CURVES[fadeOut.curve],
});
