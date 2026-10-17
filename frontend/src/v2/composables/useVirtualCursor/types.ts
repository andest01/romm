// The contract for a cursor that lives on a virtualized list: one selected
// card or row that keyboard, pad and stick move, with the scroll following it.
//
// A grid row (N cards) and a table row (one cell) are the same thing here: a
// "line" that holds a run of positions. The virtualized list owns the heights;
// the cursor only asks about them. Nothing in this file touches the DOM, so
// every behavior below can be tested with plain numbers.
//
//   Fig. 1.1  who owns what
//
//     input (key / pad / stick / wheel)
//             |
//             v
//     CursorController ---- reads ----> ListMetrics   (heights, scrollTop)
//             |                              ^
//             | asks to move the view        | implemented by the shell
//             v                              |
//        ScrollDriver  ------ writes ---> the scroller element
//
import type { Ref } from "vue";
import type { CursorKey, CursorRow } from "@/v2/utils/gridCursor";

export type { CursorKey, CursorRow };

/** A row the cursor can sit on: a run of positions `[start, end)`. A table row holds one. */
export type CursorLine = CursorRow;

/** The lines of the current list, rebuilt when the list changes. Headers are not lines. */
export interface CursorLayout {
  lines: readonly CursorLine[];
  /** For each line, the index of the virtual item that renders it (headers sit between lines). */
  itemIndex: readonly number[];
  /** Width of the cell at a position, for left and right moves and for keeping a column. */
  cellWidth: (position: number) => number;
  /** Horizontal space between cells. */
  gap: number;
}

/** Everything the cursor reads about the list. Implemented by the shell, faked in tests. */
export interface ListMetrics {
  scrollTop(): number;
  /** Largest scrollTop the scroller allows. */
  maxScrollTop(): number;
  viewportHeight(): number;
  /** Pixels at the top that sticky bars cover (nav plus toolbar). */
  occludedTop(): number;
  /** Distance from the scroll origin to the top of a virtual item, headers and padding included. */
  itemTop(itemIndex: number): number;
  /** Height of the card or row inside a line, used to find its center. */
  lineContentHeight(): number;
}

/** Where the view is allowed to leave the cursor, as fractions of the visible height. */
export interface FollowPolicy {
  /** Cursor center above this fraction pulls the view up. Default 0.35. */
  bandTop: number;
  /** Cursor center below this fraction pushes the view down. Default 0.65. */
  bandBottom: number;
  /** A jump further than this many viewports snaps instead of gliding. Default 3. */
  snapViewports: number;
  /** A single glide's length, linear, no easing. Default 110. */
  glideMs: number;
}

/** What the cursor uses to move the view. Implemented by the shell. */
export interface ScrollDriver {
  /** Glide in a straight line to `top`, or jump when it is far away. */
  glideTo(top: number): void;
  /** Jump without animation. */
  jumpTo(top: number): void;
  /** Land a glide in flight at its target, then stop it. */
  settle(): void;
  cancel(): void;
  /** True while a glide runs. */
  isGliding(): boolean;
  /** The target of the glide in flight, or null. */
  target(): number | null;
}

/** Hold Up or Down and the view cruises; release and it settles ahead. */
export interface CruiseTuning {
  /** Rows per second when the hold starts. Default 8. */
  startRowsPerSec: number;
  /** Rows per second after `rampMs`. Default 20. */
  maxRowsPerSec: number;
  rampMs: number;
  /** A pad's second event counts as a hold only inside this window, so a quick double tap stays a tap. */
  holdWindowMs: readonly [min: number, max: number];
}

/** The left stick as an analog scroll. */
export interface StickTuning {
  deadzone: number;
  minRows: number;
  maxRows: number;
  /** 1 is linear; above 1 eases the low end. */
  gamma: number;
  /** Rows the view must move past the cursor's card before the selection switches. */
  deadBand: number;
}

/** What put the cursor where it is. Consumers use it to decide on hover, backdrop and focus. */
export type CursorCause =
  "key" | "pad" | "stick" | "cruise" | "pointer" | "reseat" | "reset";

export interface CursorState {
  /** Position of the selected cell, or null before the first key press. */
  position: number | null;
  /** The column the cursor holds across vertical moves, in px from a line's left. */
  preferredX: number | null;
  /** The view is moving under cruise or stick: hold hover and backdrop still. */
  travelling: boolean;
}

export interface VirtualCursorOptions {
  layout: Ref<CursorLayout>;
  metrics: ListMetrics;
  driver: ScrollDriver;
  follow?: Partial<FollowPolicy>;
  cruise?: Partial<CruiseTuning>;
  stick?: Partial<StickTuning>;
  /** A dialog, a text field, or another owner has the keys. */
  blocked?: () => boolean;
}

export interface VirtualCursor {
  state: Readonly<Ref<CursorState>>;
  /** Handle a key press; true when it was the cursor's. A tap steps one line. */
  onKey(
    key: CursorKey,
    source: { via: "key" | "pad"; repeat: boolean },
  ): boolean;
  onKeyUp(key: string): void;
  /** The wheel or a touch took the scroll: stop gliding and cruising. */
  onManualScroll(): void;
  /** Put the cursor on `position`, as a pointer or a restore would. */
  place(position: number, cause: CursorCause): void;
  /** Move an off-screen cursor onto the visible lines before a key acts. */
  reseat(): void;
  /** Keep the cursor's line inside the follow band. */
  follow(position: number): void;
  /** The list changed under the cursor (new results, new layout). */
  reset(): void;
  dispose(): void;
}
