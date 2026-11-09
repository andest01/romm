import { computed, shallowRef, type ShallowRef } from "vue";
import {
  claimKeyRateRepeat,
  claimStickY,
  isPadEvent,
} from "@/composables/useGamepad";
import { moveFocus } from "@/composables/useSpatialNav";
import { focusFromInput } from "@/utils/autofocus";
import type { StearchAction } from "../../../store/stearch.actions";
import type { ContentView } from "../results.view";
import type { CruiseStack } from "./axis-machine";
import type { AxisStore } from "./axis-store";
import {
  DEFAULT_CRUISE,
  type ScrollFeel,
  type ScrollRow,
  type VisibleRange,
} from "./list.props";
import {
  type ArrowKey,
  activeDescendantId,
  isArrowKey,
  itemRowIndexOf,
  landingOf,
  moveFor,
  rowTopOf,
} from "./list.selectors";
import { createListStickDriver, readStickY } from "./stick-driver";
import type { KeyDriver } from "./use-key-driver";

const LEAVE_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
} as const;

const directionOf = (key: ArrowKey): -1 | 0 | 1 =>
  key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;

export interface ListInputOptions {
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
  /** Opens the current game, as Enter does. */
  open: () => void;
  /** Flips the current game in or out of the selection, and says which. */
  toggleSelected: () => PaintMode | null;
  /** The game at a position, known even before its row has loaded. */
  idAt: (position: number) => number | null;
  /** Opens the actions menu for the current game or selection. */
  openActions: () => void;
  /** Closes the overlay on top, as B does. */
  closeOverlay: () => void;
}

const OVERLAY = ".r-menu__panel, .r-dialog__panel";

type PaintMode = "add" | "remove";

/** The list's side of the machine: its drivers and the effects only a list
 *  can carry out. This is the active position's only writer. */
export function createListInput(
  options: ListInputOptions,
  machine: AxisStore,
  view: {
    activePosition: ShallowRef<number | null>;
    isScrubbing: ShallowRef<boolean>;
    cruiseStack: ShallowRef<CruiseStack | null>;
    navigate: ContentView["navigate"];
  },
) {
  const { activePosition, isScrubbing, cruiseStack, navigate } = view;
  navigate.value = (position) =>
    machine.dispatch({ type: "navigate/started", index: position });
  // The column the stick keeps, clamped to a short row.
  let column = 0;

  function positionInRow(rowIndex: number): number | null {
    const row = options.rows()[rowIndex];
    if (row?.kind !== "items") return null;
    return row.position + Math.min(column, row.slots.length - 1);
  }

  // While set, every game the cursor lands on joins or leaves the selection.
  let paint: PaintMode | null = null;

  function paintAt(position: number): void {
    const id = options.idAt(position);
    if (paint === null || id === null) return;
    options.dispatch([
      {
        type: paint === "add" ? "selection/add" : "selection/remove",
        ids: [id],
      },
    ]);
  }

  // Puts the cursor on a position and makes its game current: `null` on a
  // ghost, which has no game yet.
  function activate(position: number): void {
    activePosition.value = position;
    paintAt(position);
    const row = options.rows()[itemRowIndexOf(options.rows(), position)];
    const slot =
      row?.kind === "items" ? row.slots[position - row.position] : null;
    options.dispatch([
      { type: "attention/set", patch: { activeId: slot ? slot.id : null } },
    ]);
  }

  // Where steps move from: the current game, so a click moves the cursor
  // too; else the cursor; else the start.
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

  // The page counts: focus falls there when a tile unmounts.
  function ownsTheStick(): boolean {
    const focused = document.activeElement;
    return focused === document.body || !!gridElement()?.contains(focused);
  }

  function stepActive(key: ArrowKey, onLeave: () => void): void {
    const { position, isFresh } = origin();
    const move = isFresh
      ? { kind: "move" as const, position }
      : moveFor(options.rows(), position, key);
    if (move.kind === "leave") onLeave();
    if (move.kind !== "move") return;
    activate(move.position);
    const element = options.scroller();
    if (!element) return;
    const index = itemRowIndexOf(options.rows(), move.position);
    machine.dispatch({
      type: "step/landed",
      index,
      ...landingOf(
        rowTopOf(
          options.rows(),
          index,
          options.rowHeight(),
          options.headHeight(),
        ),
        options.rowHeight(),
        directionOf(key),
        { scrollTop: element.scrollTop, height: element.clientHeight },
      ),
    });
  }

  machine.onEffect((effect) => {
    if (effect.type === "activate") activate(effect.index);
    if (effect.type === "fly" && activePosition.value !== null) {
      options.dispatch([
        {
          type: "view/set",
          patch: { jump: { position: activePosition.value, isSmooth: true } },
        },
      ]);
    }
    if (effect.type === "follow") options.follow(effect.index);
    if (effect.type === "stack") cruiseStack.value = effect.stack;
    if (effect.type !== "step") return;
    const key = effect.key ?? (effect.direction > 0 ? "ArrowDown" : "ArrowUp");
    const grid = gridElement();
    for (let step = 0; step < effect.count; step++) {
      // Only a plain press can leave the grid; a stack stops at its edge.
      const canLeave = effect.key !== null && step === 0;
      stepActive(key, () => {
        if (canLeave && grid instanceof HTMLElement) {
          moveFocus(grid, LEAVE_DIRECTION[key]);
        }
      });
    }
  });

  const stick = createListStickDriver({
    machine,
    feel: () =>
      isScrubbing.value || !ownsTheStick() ? null : options.feel().stick,
    bandRows: () => options.feel().bandRows,
    scroller: options.scroller,
    rows: options.rows,
    rowHeight: options.rowHeight,
    headHeight: options.headHeight,
    currentRow: () => {
      const { position } = origin();
      const index = itemRowIndexOf(options.rows(), position);
      if (index === -1) return null;
      const row = options.rows()[index];
      column = row?.kind === "items" ? position - row.position : 0;
      return index;
    },
    deflection: readStickY,
    onRow: (rowIndex) => {
      const position = positionInRow(rowIndex);
      if (position !== null) activate(position);
    },
    onEnd: () => undefined,
  });

  function onKey(event: KeyboardEvent): void {
    const grid = gridElement();
    // Only on the grid itself: a sort header inside it has its own Enter.
    if (event.key === "Enter" && event.target === grid) {
      event.preventDefault();
      options.open();
      return;
    }
    if (event.key === "ContextMenu" && event.target === grid) {
      event.preventDefault();
      toggleActions();
      return;
    }
    if (event.key === " " && event.target === grid) {
      event.preventDefault();
      options.toggleSelected();
      return;
    }
    if (!(grid instanceof HTMLElement) || !isArrowKey(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (event.shiftKey && paint === null) {
      paint = "add";
      paintAt(origin().position);
    }
    // Focus stays on the list, not a tile: a virtual list unmounts tiles as
    // they scroll away, and focus on one would fall to <body>.
    if (document.activeElement !== grid) {
      focusFromInput(grid, { preventScroll: true });
    }
    machine.dispatch({
      type: "key/pressed",
      key: event.key,
      direction: directionOf(event.key),
      now: performance.now(),
      tuning: options.feel().stick?.cruise ?? DEFAULT_CRUISE,
    });
  }

  // Fast repeat only while the results have focus: menus need the slow one.
  let releaseRepeat: (() => void) | null = null;
  // Elsewhere, such as the filters, the stick has to act as arrows.
  let releaseStick: (() => void) | null = null;

  function syncStickClaim(): void {
    const owns = ownsTheStick();
    if (owns && !releaseStick && options.feel().stick) {
      releaseStick = claimStickY();
    }
    if (!owns && releaseStick) {
      releaseStick();
      releaseStick = null;
    }
  }

  const keys: KeyDriver = {
    // The D-pad's keys go to whatever has focus. A tile that unmounts drops
    // focus to the page, where nothing else would hear them.
    keyDown(event) {
      if (document.activeElement === document.body) onKey(event);
      if (event.key === "ContextMenu" && !ownsTheStick()) {
        event.preventDefault();
        toggleActions();
      }
    },
    // The pad's synthetic keyup comes with every press; its holds end by gap.
    keyUp(event) {
      if (event.key === "Shift") paint = null;
      if (!isPadEvent(event)) machine.dispatch({ type: "key/released" });
    },
    focusChanged() {
      syncStickClaim();
      const isInside = !!gridElement()?.contains(document.activeElement);
      if (isInside && !releaseRepeat) releaseRepeat = claimKeyRateRepeat();
      if (!isInside && releaseRepeat) {
        releaseRepeat();
        releaseRepeat = null;
      }
      // Focus moved to something else, like the search bar: a true exit.
      // Falling to the page is only an unmounted tile.
      if (!isInside && document.activeElement !== document.body) {
        machine.dispatch({ type: "focus/left" });
      }
    },
    // The wheel and the scrollbar move only the screen: the machine has to
    // hear it, or the next key would judge against a stale view.
    scrolled(event) {
      if (event.target === options.scroller()) stick.measure();
    },
    settled(event) {
      if (event.target === options.scroller()) stick.settle();
    },
    dispose: () => {
      releaseRepeat?.();
      releaseStick?.();
    },
  };

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

  // The button that opened a menu closes it. Only ours: other menus' buttons
  // are their own.
  let didOpenActions = false;

  function toggleActions(): void {
    if (ownsTheStick()) {
      didOpenActions = true;
      options.openActions();
    } else if (didOpenActions && document.activeElement?.closest(OVERLAY)) {
      didOpenActions = false;
      options.closeOverlay();
    }
  }

  function onPadButton(name: string): void {
    if (name === "y") toggleActions();
    if (name === "x" && ownsTheStick()) paint = options.toggleSelected();
  }

  function onPadButtonUp(name: string): void {
    if (name === "x") paint = null;
  }

  return {
    stick,
    keys,
    onKey,
    onPadButton,
    onPadButtonUp,
    activeDescendant,
    noteRange,
  };
}
