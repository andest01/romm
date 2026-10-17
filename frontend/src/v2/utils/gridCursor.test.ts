import { describe, expect, it } from "vitest";
import {
  moveCursor,
  nearestInRow,
  rowOfIndex,
  type CursorRow,
} from "./gridCursor";

// 3 rows: [0..4), [4..8), [8..10): the last one is short.
const rows: CursorRow[] = [
  { start: 0, end: 4 },
  { start: 4, end: 8 },
  { start: 8, end: 10 },
];
const width = () => 100;
const gap = 10;

const move = (
  key: Parameters<typeof moveCursor>[0],
  index: number,
  x: number | null = null,
) => moveCursor(key, index, x, rows, width, gap, 2);

describe("rowOfIndex", () => {
  it("finds the row holding an index, including row boundaries", () => {
    expect([0, 3, 4, 7, 8, 9].map((i) => rowOfIndex(rows, i))).toEqual([
      0, 0, 1, 1, 2, 2,
    ]);
  });
});

describe("moveCursor", () => {
  it("steps one card left and right and stops at the ends", () => {
    expect(move("ArrowRight", 3).index).toBe(4);
    expect(move("ArrowLeft", 4).index).toBe(3);
    expect(move("ArrowLeft", 0).index).toBe(0);
    expect(move("ArrowRight", 9).index).toBe(9);
  });

  it("moves down and up a row keeping the column", () => {
    expect(move("ArrowDown", 1).index).toBe(5);
    expect(move("ArrowUp", 6).index).toBe(2);
  });

  it("clamps at the first and last row", () => {
    expect(move("ArrowUp", 2).index).toBe(2);
    expect(move("ArrowDown", 9).index).toBe(9);
  });

  it("lands on the nearest card of a shorter last row and remembers the column", () => {
    const down = move("ArrowDown", 7);
    expect(down.index).toBe(9);

    const back = move("ArrowUp", down.index, down.preferredX);
    expect(back.index).toBe(7);
  });

  it("pages by the given number of rows, clamped", () => {
    expect(move("PageDown", 0).index).toBe(8);
    expect(move("PageUp", 9).index).toBe(1);
  });

  it("jumps to the first and last card", () => {
    expect(move("Home", 6).index).toBe(0);
    expect(move("End", 2).index).toBe(9);
  });
});

describe("nearestInRow", () => {
  it("picks the card whose center is closest to x", () => {
    expect(nearestInRow(rows[0]!, 0, width, gap)).toBe(0);
    expect(nearestInRow(rows[0]!, 9999, width, gap)).toBe(3);
  });
});
