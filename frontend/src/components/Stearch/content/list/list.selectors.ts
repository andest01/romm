import { LIST_ROW_HEIGHT_PX } from "@/components/Gallery/listColumns";
import type { StearchAction } from "../../Stearch.actions";
import {
  itemsAheadAt,
  type LoadPace,
  READ_AHEAD,
  type ReadAheadPolicy,
} from "../../Stearch.read-ahead";
import type { ListSlot } from "../../Stearch.rows.selectors";
import type { StearchViewMode, VisibleSpan } from "../../Stearch.state-props";
import type { StearchDevice } from "../content.view";
import { LIST_ITEMS } from "./list.items";
import type {
  CruiseFeel,
  StickFeel,
  ListItemKind,
  ListProps,
  ScrollRow,
  VisibleRange,
} from "./list.props";

const COLUMN_GAP = 6;
// The line under a cover, plus borders and the gap to the next row (v4 6.2).
const PHONE_COVER_CHROME = 17 + 4;

/** How one item kind fills a row: its narrowest width, the column bounds, and
 *  a fixed height, or `"cover"` for a 2:3 cover that follows its width. */
interface ItemSizing {
  readonly minWidth: number;
  readonly minColumns: number;
  readonly maxColumns: number;
  readonly height: number | "cover";
}

const ITEM_SIZING = {
  tile: { minWidth: 300, minColumns: 1, maxColumns: 6, height: 62 },
  "phone-row": { minWidth: 0, minColumns: 1, maxColumns: 1, height: 52 },
  "phone-cover": {
    minWidth: 56,
    minColumns: 4,
    maxColumns: 6,
    height: "cover",
  },
  "gallery-row": {
    minWidth: 0,
    minColumns: 1,
    maxColumns: 1,
    height: LIST_ROW_HEIGHT_PX,
  },
} as const satisfies Readonly<Record<ListItemKind, ItemSizing>>;

/** What a width allows for one kind. Same rule as CSS `auto-fill`, and as
 *  `useResponsiveColumns`, bounded per kind. */
export function itemFit(
  kind: ListItemKind,
  { width }: Pick<DOMRectReadOnly, "width">,
): Pick<ListProps, "columns" | "rowHeight"> {
  const { minWidth, minColumns, maxColumns, height } = ITEM_SIZING[kind];
  const fits = Math.floor((width + COLUMN_GAP) / (minWidth + COLUMN_GAP));
  const columns = Math.min(maxColumns, Math.max(minColumns, fits));
  if (height !== "cover") return { columns, rowHeight: height };
  const coverWidth = (width - COLUMN_GAP * (columns - 1)) / columns;
  return {
    columns,
    rowHeight: Math.ceil(coverWidth * 1.5) + PHONE_COVER_CHROME,
  };
}

/** Phones get phone items; Table on a phone shows phone rows. */
export const itemKindFor = (
  device: StearchDevice,
  mode: StearchViewMode,
): ListItemKind => {
  if (device === "wide") return "tile";
  return mode === "table" ? "phone-row" : "phone-cover";
};

/** Everything the list needs about its size. The box and device are view
 *  facts, so this is a plain function, not a selector of state. */
export function listFitFor(
  kind: ListItemKind,
  device: StearchDevice,
  box: Pick<DOMRectReadOnly, "width">,
): Pick<ListProps, "item" | "columns" | "rowHeight" | "headHeight"> {
  return {
    item: LIST_ITEMS[kind],
    ...itemFit(kind, box),
    headHeight: headHeightFor(device === "phone"),
  };
}

/** Before the first window lands there are no slots, so draw a screen of
 *  ghosts, and never fewer than the window being fetched. */
export const withGhosts = (
  slots: readonly ListSlot[],
  isLoading: boolean,
  screenOfItems: number,
): readonly ListSlot[] =>
  slots.length === 0 && isLoading
    ? Array.from(
        { length: Math.max(screenOfItems, READ_AHEAD.itemsPerWindow) },
        () => null,
      )
    : slots;

export const headHeightFor = (isPhone: boolean): number => (isPhone ? 26 : 28);

/** Lays slots out as rows. Each section starts a heading and a fresh row, as
 *  in v4 6.1; without sections it's one flat run. */
export function buildScrollRows(
  slots: readonly ListSlot[],
  columns: number,
  sections: readonly { key: string; start: number; size: number }[],
): readonly ScrollRow[] {
  const rows: ScrollRow[] = [];
  const pushItems = (from: number, to: number) => {
    for (let position = from; position < to; position += columns) {
      rows.push({
        kind: "items",
        key: `items-${position}`,
        position,
        slots: slots.slice(position, Math.min(position + columns, to)),
      });
    }
  };
  if (sections.length === 0) pushItems(0, slots.length);
  for (const { key, start, size } of sections) {
    rows.push({
      kind: "head",
      key: `head-${key}`,
      position: start,
      label: key,
    });
    pushItems(start, start + size);
  }
  return rows;
}

/** The row to scroll to, heading first when a section starts there. */
export function rowForPosition(
  rows: readonly ScrollRow[],
  position: number,
): number {
  const index = rows.findIndex((row) => row.position >= position);
  return index === -1 ? rows.length - 1 : index;
}

export function headTopsOf(
  rows: readonly ScrollRow[],
  rowHeight: number,
  headHeight: number,
): readonly number[] {
  const tops: number[] = [];
  let top = 0;
  for (const row of rows) {
    if (row.kind === "head") tops.push(top);
    top += row.kind === "head" ? headHeight : rowHeight;
  }
  return tops;
}

/** The next heading pushes the band up as it arrives. */
export function bandOffsetFor(
  headTops: readonly number[],
  scrollTop: number,
  bandHeight: number,
): number {
  const next = headTops.find((top) => top > scrollTop);
  if (next === undefined) return 0;
  return Math.min(0, next - scrollTop - bandHeight);
}

/** Reports the top of the list, and asks for every window the visible rows
 *  touch; the store skips loaded ones. */
export function buildWindowActions(
  { first, last }: VisibleRange,
  rows: readonly ScrollRow[],
  { previousPosition, itemsPerScreen, pace, itemsPerSecond }: ScrollContext,
  policy: ReadAheadPolicy = READ_AHEAD,
): readonly StearchAction[] {
  const top = rows[first];
  const bottom = rows[Math.min(last, rows.length - 1)];
  const end = rows.at(-1);
  const visibleSpan = spanOf({ first, last }, rows);
  // An empty range shows nothing, so there's nothing to report or fetch.
  if (!top || !bottom || !end || !visibleSpan) return [];
  const total =
    end.kind === "items" ? end.position + end.slots.length : end.position;
  const isDown = top.position >= previousPosition;
  const ahead = itemsAheadAt(itemsPerSecond, itemsPerScreen, policy);
  const behind = policy.screensBehind * itemsPerScreen;
  const windowOf = (position: number) =>
    Math.floor(position / policy.itemsPerWindow);
  const firstVisible = windowOf(top.position);
  const lastVisible = windowOf(bottom.position);
  const lowest = windowOf(
    Math.max(0, top.position - (isDown ? behind : ahead)),
  );
  const highest = windowOf(
    Math.max(
      0,
      Math.min(total - 1, bottom.position + (isDown ? ahead : behind)),
    ),
  );
  const span = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
  const below = span(lastVisible + 1, highest);
  const above = span(lowest, firstVisible - 1).reverse();
  // Visible first, then the way the user is going, then the way they came.
  const order = [
    ...span(firstVisible, lastVisible),
    ...(isDown ? [...below, ...above] : [...above, ...below]),
  ];
  return [
    { type: "view/set", patch: { visibleSpan } },
    ...order.map((window): StearchAction => ({
      type: "window/wanted",
      offset: window * policy.itemsPerWindow,
      pace,
    })),
  ];
}

/** The first and last result a range shows. */
export function spanOf(
  { first, last }: VisibleRange,
  rows: readonly ScrollRow[],
): VisibleSpan | null {
  const top = rows[first];
  const bottom = rows[Math.min(last, rows.length - 1)];
  if (!top || !bottom) return null;
  const end =
    bottom.kind === "items"
      ? bottom.position + bottom.slots.length - 1
      : bottom.position;
  return { first: top.position, last: end };
}

/** What a range event needs besides the range: where the list was, and how
 *  many results fill one screen on this device. */
export interface ScrollContext {
  previousPosition: number;
  itemsPerScreen: number;
  /** How eagerly the wanted windows load; see `LoadPace`. */
  pace: LoadPace;
  /** How fast the list is moving, in results per second, from any input. */
  itemsPerSecond: number;
}

/** The list's speed between two sightings of its top position, in results
 *  per second. A gap too long to be one movement reads as stopped. */
export const listSpeed = (
  before: { position: number; atMs: number },
  after: { position: number; atMs: number },
): number => {
  const elapsed = after.atMs - before.atMs;
  if (elapsed <= 0 || elapsed > LIST_SPEED_GAP_MS) return 0;
  return ((after.position - before.position) * 1000) / elapsed;
};

/** Sightings further apart than this belong to separate movements. */
export const LIST_SPEED_GAP_MS = 250;

/** Results that fill one screen: columns times the rows that fit. */
export const itemsPerScreen = (
  { columns, rowHeight }: Pick<ListProps, "columns" | "rowHeight">,
  { height }: Pick<DOMRectReadOnly, "height">,
): number => columns * Math.max(1, Math.ceil(height / rowHeight));

/** The centre band: the window, `bandHeight` tall and centred in the
 *  viewport, that the active row is kept inside while moving by keys.
 *  Returns the scrollTop that puts the row back inside it, or the current
 *  one when it is already inside, so a held key never fights a scroll. */
export const followScrollTop = (
  row: Pick<DOMRectReadOnly, "top" | "height">,
  view: { scrollTop: number; height: number; contentHeight: number },
  bandHeight: number,
): number => {
  const band = Math.min(Math.max(bandHeight, row.height), view.height);
  const inset = (view.height - band) / 2;
  const bandTop = view.scrollTop + inset;
  const wanted =
    row.top < bandTop
      ? row.top - inset
      : row.top + row.height > bandTop + band
        ? row.top + row.height - band - inset
        : view.scrollTop;
  const maxScrollTop = Math.max(0, view.contentHeight - view.height);
  return Math.min(Math.max(wanted, 0), maxScrollTop);
};

/** What an arrow key does to the active position. `leave` hands the key back
 *  so focus can move to the next region; `stay` keeps it, doing nothing. */
export type KeyMove =
  | { readonly kind: "move"; readonly position: number }
  | { readonly kind: "leave" }
  | { readonly kind: "stay" };

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
export type ArrowKey = (typeof ARROW_KEYS)[number];

export const isArrowKey = (key: string): key is ArrowKey =>
  ARROW_KEYS.some((arrow) => arrow === key);

/** The scroller row holding a position, or -1. */
export const itemRowIndexOf = (
  rows: readonly ScrollRow[],
  position: number,
): number =>
  rows.findIndex(
    (row) =>
      row.kind === "items" &&
      position >= row.position &&
      position < row.position + row.slots.length,
  );

const nextItemRow = (
  rows: readonly ScrollRow[],
  from: number,
  step: 1 | -1,
): Extract<ScrollRow, { kind: "items" }> | null => {
  for (
    let index = from + step;
    index >= 0 && index < rows.length;
    index += step
  ) {
    const row = rows[index];
    if (row?.kind === "items") return row;
  }
  return null;
};

/** Moves by position, not by mounted DOM, so it carries on past the rows on
 *  screen. Up and down keep the column; only the first row and first column
 *  let the key leave (spec 007 F1 to F4). */
export function moveFor(
  rows: readonly ScrollRow[],
  position: number,
  key: ArrowKey,
): KeyMove {
  const index = itemRowIndexOf(rows, position);
  const row = rows[index];
  if (row?.kind !== "items") {
    const first = nextItemRow(rows, -1, 1);
    return first
      ? { kind: "move", position: first.position }
      : { kind: "stay" };
  }
  const column = position - row.position;
  if (key === "ArrowLeft") {
    return column > 0
      ? { kind: "move", position: position - 1 }
      : { kind: "leave" };
  }
  if (key === "ArrowRight") {
    return column + 1 < row.slots.length
      ? { kind: "move", position: position + 1 }
      : { kind: "stay" };
  }
  const next = nextItemRow(rows, index, key === "ArrowDown" ? 1 : -1);
  if (!next) return key === "ArrowUp" ? { kind: "leave" } : { kind: "stay" };
  return {
    kind: "move",
    position: next.position + Math.min(column, next.slots.length - 1),
  };
}

/** The DOM id of the item at a position. */
export const itemDomId = (position: number): string =>
  `stearch-item-${position}`;

/** The active item's DOM id for `aria-activedescendant`, or `null` when it
 *  isn't there to point at: a ghost, or a row the scroller hasn't mounted. */
export function activeDescendantId(
  rows: readonly ScrollRow[],
  position: number | null,
  visible: VisibleRange | null,
): string | null {
  if (position === null || visible === null) return null;
  const index = itemRowIndexOf(rows, position);
  if (index < visible.first || index > visible.last) return null;
  const row = rows[index];
  if (row?.kind !== "items" || !row.slots[position - row.position]) return null;
  return itemDomId(position);
}

/** Whether a step moves the view. A row out of view always comes back. In
 *  view, a step heading for the centre just walks, so the view doesn't yank;
 *  at or past the centre it follows. Sideways steps (`direction` 0) stay put. */
export function stepFollows(
  rowTop: number,
  rowHeight: number,
  direction: -1 | 0 | 1,
  view: { scrollTop: number; height: number },
): boolean {
  const isInView =
    rowTop >= view.scrollTop &&
    rowTop + rowHeight <= view.scrollTop + view.height;
  if (!isInView) return true;
  if (direction === 0) return false;
  const centre = view.scrollTop + view.height / 2;
  return direction * (rowTop + rowHeight / 2 - centre) >= 0;
}

/** The top of a scroller row, in content pixels. */
export const rowTopOf = (
  rows: readonly ScrollRow[],
  index: number,
  rowHeight: number,
  headHeight: number,
): number =>
  rows
    .slice(0, index)
    .reduce(
      (top, row) => top + (row.kind === "head" ? headHeight : rowHeight),
      0,
    );

/** A tap's glide at `elapsedMs`: a straight line from `from` to `target`
 *  over `glideMs`, with no easing, so a step never lunges then settles. A
 *  `glideMs` of 0 is a jump cut. */
export const glideStep = (
  from: number,
  target: number,
  elapsedMs: number,
  glideMs: number,
): number =>
  glideMs <= 0
    ? target
    : from + (target - from) * Math.min(1, Math.max(0, elapsedMs / glideMs));

/** Cruise speed after holding for `heldMs`: a linear ramp, then flat. */
export const cruiseRowsPerSecond = (
  heldMs: number,
  { startRowsPerSecond, maxRowsPerSecond, rampMs }: CruiseFeel,
): number =>
  startRowsPerSecond +
  (maxRowsPerSecond - startRowsPerSecond) *
    Math.min(1, rampMs <= 0 ? 1 : heldMs / rampMs);

/** The item row under the viewport's centre line, or the next item row when
 *  a heading sits there. -1 when there are no item rows. */
export function itemRowAtCentre(
  rows: readonly ScrollRow[],
  centre: number,
  rowHeight: number,
  headHeight: number,
): number {
  let top = 0;
  let nearest = -1;
  for (const [index, row] of rows.entries()) {
    const height = row.kind === "head" ? headHeight : rowHeight;
    if (row.kind === "items") nearest = index;
    if (centre < top + height) {
      if (row.kind === "items") return index;
      const next = rows.findIndex(
        (candidate, at) => at > index && candidate.kind === "items",
      );
      return next === -1 ? nearest : next;
    }
    top += height;
  }
  return nearest;
}

/** Stick speed from its deflection (-1 to 1): 0 inside the deadzone, then
 *  from the slow to the fast speed along the curve. Signed: negative is up. */
export function stickRowsPerSecond(
  deflection: number,
  {
    deadzone,
    minRowsPerSecond,
    maxRowsPerSecond,
    gamma,
  }: Pick<
    StickFeel,
    "deadzone" | "minRowsPerSecond" | "maxRowsPerSecond" | "gamma"
  >,
): number {
  const push = Math.abs(deflection);
  if (push < deadzone) return 0;
  const past = Math.min(1, (push - deadzone) / Math.max(1e-6, 1 - deadzone));
  const speed =
    minRowsPerSecond +
    (maxRowsPerSecond - minRowsPerSecond) * Math.pow(past, gamma);
  return Math.sign(deflection) * speed;
}

/** A released stick needs to fall this far under the deadzone, so it
 *  doesn't chatter on and off at the edge. */
export const STICK_RELEASE_RATIO = 0.7;

/** Whether the stick is pushed, with hysteresis: it starts past the
 *  deadzone and stops below `STICK_RELEASE_RATIO` of it. */
export const isStickPushed = (
  deflection: number,
  deadzone: number,
  wasPushed: boolean,
): boolean =>
  Math.abs(deflection) >=
  (wasPushed ? deadzone * STICK_RELEASE_RATIO : deadzone);

/** The current row while the view moves under a stick: it holds until its
 *  middle leaves the centre band (`bandRows` tall, centred on the line), then
 *  `leadingRow` takes over: the row at the band's leading edge, as a key
 *  press would leave it. The band is the hysteresis, so the active row's
 *  middle never leaves the band. */
export const stickCurrentRow = (
  leadingRow: number,
  currentRow: number,
  rowsFromCurrent: number,
  bandRows: number,
): number =>
  leadingRow !== currentRow && Math.abs(rowsFromCurrent) > bandRows / 2
    ? leadingRow
    : currentRow;

/** Where to look for the leading row: inside the band's leading edge by
 *  half a row, so the row found there has its middle inside the band. On
 *  one axis; `direction` is the way the view is moving (-1, 0 or 1). */
export const leadingPoint = (
  centre: number,
  bandSize: number,
  cellSize: number,
  direction: number,
): number =>
  centre + Math.sign(direction) * Math.max(0, bandSize / 2 - cellSize / 2);
