import { LIST_ROW_HEIGHT_PX } from "@/components/Gallery/listColumns";
import type { StearchAction } from "../../Stearch.actions";
import { READ_AHEAD, type ReadAheadPolicy } from "../../Stearch.read-ahead";
import type { ListSlot } from "../../Stearch.rows.selectors";
import type { StearchViewMode, VisibleSpan } from "../../Stearch.state-props";
import type { StearchDevice } from "../content.view";
import { LIST_ITEMS } from "./list.items";
import type {
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
  { previousPosition, itemsPerScreen }: ScrollContext,
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
  const ahead = policy.screensAhead * itemsPerScreen;
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
}

/** Results that fill one screen: columns times the rows that fit. */
export const itemsPerScreen = (
  { columns, rowHeight }: Pick<ListProps, "columns" | "rowHeight">,
  { height }: Pick<DOMRectReadOnly, "height">,
): number => columns * Math.max(1, Math.ceil(height / rowHeight));
