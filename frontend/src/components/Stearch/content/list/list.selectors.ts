import { LIST_ROW_HEIGHT_PX } from "@/components/Gallery/listColumns";
import type { StearchAction } from "../../Stearch.actions";
import { STEARCH_WINDOW_SIZE } from "../../Stearch.window-size";
import type {
  ListItemKind,
  ListSlot,
  ScrollRow,
  VisibleRange,
} from "./list.props";

const ROW_HEIGHT: Readonly<
  Record<Exclude<ListItemKind, "phone-cover">, number>
> = {
  tile: 62,
  "phone-row": 52,
  "gallery-row": LIST_ROW_HEIGHT_PX,
};

const COLUMN_GAP = 6;
// The line under a cover, plus borders and the gap to the next row (v4 6.2).
const PHONE_COVER_CHROME = 17 + 4;

const COLUMNS: Readonly<Record<ListItemKind, number>> = {
  tile: 4,
  "phone-row": 1,
  "phone-cover": 5,
  "gallery-row": 1,
};

/** Columns come from the item and panel, never from measuring (v4 section 1). */
export const columnsFor = (
  kind: ListItemKind,
  isPanelShown: boolean,
): number =>
  kind === "tile" && isPanelShown ? COLUMNS.tile - 1 : COLUMNS[kind];

/** Covers are 2:3, so their row height follows the list's width. */
export function rowHeightFor(kind: ListItemKind, listWidth: number): number {
  if (kind !== "phone-cover") return ROW_HEIGHT[kind];
  const columns = COLUMNS[kind];
  const coverWidth = (listWidth - COLUMN_GAP * (columns - 1)) / columns;
  return Math.ceil(coverWidth * 1.5) + PHONE_COVER_CHROME;
}

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
): readonly StearchAction[] {
  const top = rows[first];
  const bottom = rows[Math.min(last, rows.length - 1)];
  if (!top || !bottom) return [];
  const firstWindow = Math.floor(top.position / STEARCH_WINDOW_SIZE);
  const lastWindow = Math.floor(bottom.position / STEARCH_WINDOW_SIZE);
  const actions: StearchAction[] = [
    { type: "view/set", patch: { visiblePosition: top.position } },
  ];
  for (let window = firstWindow; window <= lastWindow; window += 1) {
    actions.push({
      type: "window/wanted",
      offset: window * STEARCH_WINDOW_SIZE,
    });
  }
  return actions;
}
