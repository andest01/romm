// Grid cursor math for a flow-packed grid of known row ranges and card widths.
// Pure: no DOM reads, so a key press is a few comparisons and one binary search.

export interface CursorRow {
  /** First index (inclusive) into the shown list. */
  start: number;
  /** One past the last index. */
  end: number;
}

export type CursorKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "PageUp"
  | "PageDown"
  | "Home"
  | "End";

export interface CursorMove {
  index: number;
  /** Horizontal center to keep across vertical moves, in px. */
  preferredX: number;
}

/** Row holding `index` (rows are contiguous and ascending). */
export function rowOfIndex(rows: CursorRow[], index: number): number {
  let lo = 0;
  let hi = rows.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (rows[mid]!.start <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Horizontal center of the card at `index` inside its row. */
export function centerX(
  row: CursorRow,
  index: number,
  widthOf: (index: number) => number,
  gap: number,
): number {
  let x = 0;
  for (let i = row.start; i < index; i++) x += widthOf(i) + gap;
  return x + widthOf(index) / 2;
}

/** The card in `row` whose center is nearest `x`. */
export function nearestInRow(
  row: CursorRow,
  x: number,
  widthOf: (index: number) => number,
  gap: number,
): number {
  let best = row.start;
  let bestDist = Infinity;
  let left = 0;
  for (let i = row.start; i < row.end; i++) {
    const w = widthOf(i);
    const dist = Math.abs(left + w / 2 - x);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
    left += w + gap;
  }
  return best;
}

/** Where `key` moves the cursor, clamped at the ends (no wrap). */
export function moveCursor(
  key: CursorKey,
  index: number,
  preferredX: number | null,
  rows: CursorRow[],
  widthOf: (index: number) => number,
  gap: number,
  pageRows: number,
): CursorMove {
  const last = rows.length ? rows[rows.length - 1]!.end - 1 : 0;
  const here = rows[rowOfIndex(rows, index)];
  const keepX = (i: number): number =>
    preferredX ?? centerX(rows[rowOfIndex(rows, i)]!, i, widthOf, gap);
  const fresh = (i: number): CursorMove => {
    const row = rows[rowOfIndex(rows, i)]!;
    return { index: i, preferredX: centerX(row, i, widthOf, gap) };
  };

  switch (key) {
    case "ArrowLeft":
      return fresh(Math.max(0, index - 1));
    case "ArrowRight":
      return fresh(Math.min(last, index + 1));
    case "Home":
      return fresh(0);
    case "End":
      return fresh(last);
    default: {
      if (!here) return { index, preferredX: 0 };
      const rowIdx = rowOfIndex(rows, index);
      const step =
        key === "ArrowUp"
          ? -1
          : key === "ArrowDown"
            ? 1
            : key === "PageUp"
              ? -pageRows
              : pageRows;
      const target = Math.min(rows.length - 1, Math.max(0, rowIdx + step));
      const x = keepX(index);
      return {
        index: nearestInRow(rows[target]!, x, widthOf, gap),
        preferredX: x,
      };
    }
  }
}
