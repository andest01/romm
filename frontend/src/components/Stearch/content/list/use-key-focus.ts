import { useEventListener } from "@vueuse/core";
import { computed, onBeforeUnmount, readonly, shallowRef } from "vue";
import { claimKeyRateRepeat, isPadEvent } from "@/composables/useGamepad";
import { moveFocus } from "@/composables/useSpatialNav";
import { focusFromInput } from "@/utils/autofocus";
import type { StearchAction } from "../../Stearch.actions";
import { useContentView } from "../content.view";
import type { ScrollFeel, ScrollRow, VisibleRange } from "./list.props";
import {
  type ArrowKey,
  activeDescendantId,
  isArrowKey,
  itemRowIndexOf,
  moveFor,
  rowTopOf,
  stepFollows,
} from "./list.selectors";
import { useCruise } from "./use-cruise";
import { readStickY, useStickScroll } from "./use-stick-scroll";

const LEAVE_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
} as const;

/** Arrow keys inside the results. A press moves the content view's active
 *  position one step and the scroller follows it into the centre band, as
 *  the feel says; a held ↑ or ↓ cruises when the feel has a cruise. Only
 *  the first row and column let a key leave. This is the active position's
 *  only writer. */
export function useKeyFocus(options: {
  rows: () => readonly ScrollRow[];
  /** Where the first key starts when nothing is current. */
  start: () => number;
  /** The current game's position, so a click moves the cursor too. */
  currentPosition: () => number | null;
  feel: () => ScrollFeel;
  rowHeight: () => number;
  headHeight: () => number;
  scroller: () => HTMLElement | null;
  follow: (rowIndex: number) => void;
  dispatch: (actions: readonly StearchAction[]) => void;
}) {
  const { activePosition } = useContentView();
  // The column a cruise keeps, read when it starts.
  let cruiseColumn = 0;

  // A cruise row keeps the column it started in, clamped to a short row.
  function positionInRow(rowIndex: number): number | null {
    const row = options.rows()[rowIndex];
    if (row?.kind !== "items") return null;
    return row.position + Math.min(cruiseColumn, row.slots.length - 1);
  }

  const cruise = useCruise({
    feel: () => options.feel().cruise,
    scroller: options.scroller,
    rows: options.rows,
    rowHeight: options.rowHeight,
    headHeight: options.headHeight,
    onRow: (rowIndex) => {
      const position = positionInRow(rowIndex);
      if (position !== null) activate(position);
    },
    onEnd: (rowIndex) => {
      if (rowIndex === null) return;
      const position = positionInRow(rowIndex);
      if (position === null) return;
      activate(position);
      options.follow(rowIndex);
    },
  });
  useEventListener(window, "keyup", (event: KeyboardEvent) =>
    cruise.keyUp(event.key),
  );

  // The stick moves the view and the current game catches up (spec 008).
  // Letting go leaves the view where it is.
  const { isScrubbing } = useContentView();
  const stick = useStickScroll({
    feel: () => (isScrubbing.value ? null : options.feel().stick),
    bandRows: () => options.feel().bandRows,
    scroller: options.scroller,
    rows: options.rows,
    rowHeight: options.rowHeight,
    headHeight: options.headHeight,
    currentRow: () => {
      const position = origin().position;
      const index = itemRowIndexOf(options.rows(), position);
      if (index === -1) return null;
      const row = options.rows()[index];
      cruiseColumn = row?.kind === "items" ? position - row.position : 0;
      return index;
    },
    onRow: (rowIndex) => {
      const position = positionInRow(rowIndex);
      if (position !== null) activate(position);
    },
    deflection: readStickY,
    loop: "pad",
    onStep: (key) => stepActive(key, () => undefined),
    onEnd: () => undefined,
  });

  // Puts the cursor on a position and makes its game current: `null` on a
  // ghost, which has no game yet.
  function activate(position: number): void {
    activePosition.value = position;
    const row = options.rows()[itemRowIndexOf(options.rows(), position)];
    const slot =
      row?.kind === "items" ? row.slots[position - row.position] : null;
    options.dispatch([
      { type: "attention/set", patch: { activeId: slot ? slot.id : null } },
    ]);
  }

  // Where keys move from: the current game if there is one, so a click
  // moves the cursor too; else the cursor; else the start.
  function origin(): { position: number; isFresh: boolean } {
    const current = options.currentPosition();
    if (current !== null) return { position: current, isFresh: false };
    if (activePosition.value !== null) {
      return { position: activePosition.value, isFresh: false };
    }
    return { position: options.start(), isFresh: true };
  }

  const gridElement = (): Element | null | undefined =>
    options.scroller()?.closest('[role="grid"]');

  // The D-pad's arrows go to whatever has focus. A tile that unmounts drops
  // focus to the page, where nothing else would hear them.
  useEventListener(window, "keydown", (event: KeyboardEvent) => {
    if (document.activeElement === document.body) onKey(event);
  });

  // Fast repeat only while the results have focus: menus need the slow one.
  let releaseRepeat: (() => void) | null = null;
  function syncRepeatClaim(): void {
    const isInside = !!gridElement()?.contains(document.activeElement);
    if (isInside && !releaseRepeat) releaseRepeat = claimKeyRateRepeat();
    if (!isInside && releaseRepeat) {
      releaseRepeat();
      releaseRepeat = null;
    }
  }
  useEventListener(document, "focusin", syncRepeatClaim);
  useEventListener(document, "focusout", syncRepeatClaim);
  onBeforeUnmount(() => releaseRepeat?.());

  function onKey(event: KeyboardEvent): void {
    const grid = gridElement();
    if (!(grid instanceof HTMLElement) || !isArrowKey(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    // A key takes over from a moving stick at once.
    stick.cancel();
    // Hold DOM focus on the list, not a tile: a virtual list unmounts tiles
    // as they scroll away or load, and focus on one would fall to <body>.
    if (document.activeElement !== grid) {
      focusFromInput(grid, { preventScroll: true });
    }
    const { position } = origin();
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const row = options.rows()[itemRowIndexOf(options.rows(), position)];
      cruiseColumn = row?.kind === "items" ? position - row.position : 0;
      const source = {
        via: isPadEvent(event) ? ("pad" as const) : ("key" as const),
        isRepeat: event.repeat,
      };
      if (cruise.feed(event.key, source)) return;
    } else {
      cruise.cancel();
    }
    const { key } = event;
    if (isArrowKey(key))
      stepActive(key, () => moveFocus(grid, LEAVE_DIRECTION[key]));
  }

  // One step, from a key, the D-pad, or the stick where it can't pan.
  function stepActive(key: ArrowKey, onLeave: () => void): void {
    const { position, isFresh } = origin();
    const move = isFresh
      ? { kind: "move" as const, position }
      : moveFor(options.rows(), position, key);
    if (move.kind === "leave") {
      onLeave();
      return;
    }
    if (move.kind === "stay") return;
    activate(move.position);
    const rowIndex = itemRowIndexOf(options.rows(), move.position);
    const element = options.scroller();
    if (
      element &&
      !stepFollows(
        rowTopOf(
          options.rows(),
          rowIndex,
          options.rowHeight(),
          options.headHeight(),
        ),
        options.rowHeight(),
        key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0,
        { scrollTop: element.scrollTop, height: element.clientHeight },
      )
    ) {
      return;
    }
    options.follow(rowIndex);
  }

  const visibleRange = shallowRef<VisibleRange | null>(null);
  const activeDescendant = computed(() =>
    activeDescendantId(
      options.rows(),
      activePosition.value,
      visibleRange.value,
    ),
  );
  const noteRange = (range: VisibleRange): void => {
    visibleRange.value = range;
  };

  return {
    activePosition: readonly(activePosition),
    activeDescendant,
    noteRange,
    onKey,
  };
}
