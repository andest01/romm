// The two-axis spike (spec 009). Most of 1D carries over by running it once
// per axis: `followScrollTop` follows, `stickCurrentRow` hands over. Only the
// stick's velocity is new, because a radial deadzone needs both axes at once.

/** How a 2D grid moves. Separate from `ScrollFeel` until the spike says how
 *  to merge them. */
export interface Grid2dFeel {
  /** The centre box, in cells: the active cell lives inside it. */
  readonly boxRows: number;
  readonly boxCols: number;
  /** Stick travel ignored around the centre, as a radius from 0 to 1. */
  readonly deadzone: number;
  /** Cells per second just past the deadzone, and at full push. */
  readonly minCellsPerSecond: number;
  readonly maxCellsPerSecond: number;
  /** The curve between them: 1 is linear, above 1 is finer when slow. */
  readonly gamma: number;
}

export interface Cell {
  readonly row: number;
  readonly col: number;
}

export interface Vector {
  readonly x: number;
  readonly y: number;
}

/** The stick's velocity in cells per second, radial: one deadzone and one
 *  curve on the push's length, so a diagonal is no faster than straight. */
export function stickVelocity(
  { x, y }: Vector,
  {
    deadzone,
    minCellsPerSecond,
    maxCellsPerSecond,
    gamma,
  }: Pick<
    Grid2dFeel,
    "deadzone" | "minCellsPerSecond" | "maxCellsPerSecond" | "gamma"
  >,
): Vector {
  const length = Math.hypot(x, y);
  if (length < deadzone || length === 0) return { x: 0, y: 0 };
  const past = Math.min(
    1,
    (Math.min(length, 1) - deadzone) / Math.max(1e-6, 1 - deadzone),
  );
  const speed =
    minCellsPerSecond +
    (maxCellsPerSecond - minCellsPerSecond) * Math.pow(past, gamma);
  return { x: (x / length) * speed, y: (y / length) * speed };
}

/** The push's length, for the deadzone's start-and-stop hysteresis. */
export const pushLength = ({ x, y }: Vector): number => Math.hypot(x, y);

/** The cell index under a point along one axis, clamped to the grid. */
export const indexAt = (
  offset: number,
  cellSize: number,
  count: number,
): number =>
  Math.min(count - 1, Math.max(0, Math.floor(offset / Math.max(1, cellSize))));

/** Item to coordinate: a cell's middle on the plane, in pixels. */
export const pointOf = ({ row, col }: Cell, cellSize: number): Vector => ({
  x: (col + 0.5) * cellSize,
  y: (row + 0.5) * cellSize,
});

/** The scroll offsets that put a cell in the middle of a view. The scroller
 *  clamps them at the plane's limits. */
export const centreTarget = (
  cell: Cell,
  cellSize: number,
  view: { width: number; height: number },
): Vector => {
  const { x, y } = pointOf(cell, cellSize);
  return { x: x - view.width / 2, y: y - view.height / 2 };
};

/** One D-pad or arrow press: a cell in that direction, clamped to the grid. */
export function moveCell(
  { row, col }: Cell,
  key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
  { rows, cols }: { rows: number; cols: number },
): Cell {
  const clamp = (value: number, size: number) =>
    Math.min(size - 1, Math.max(0, value));
  if (key === "ArrowUp") return { row: clamp(row - 1, rows), col };
  if (key === "ArrowDown") return { row: clamp(row + 1, rows), col };
  if (key === "ArrowLeft") return { row, col: clamp(col - 1, cols) };
  return { row, col: clamp(col + 1, cols) };
}

/** The cells to mount for a viewport, along one axis, with a ring around. */
export const mountedSpan = (
  scroll: number,
  view: number,
  cellSize: number,
  count: number,
  ring: number,
): { first: number; last: number } => ({
  first: Math.max(0, Math.floor(scroll / cellSize) - ring),
  last: Math.min(count - 1, Math.ceil((scroll + view) / cellSize) + ring),
});

/** Whether a step that landed on `index` went away from the view's centre. */
export const isMovingAway = (
  index: number,
  direction: number,
  centre: number,
  cellSize: number,
): boolean => direction * ((index + 0.5) * cellSize - centre) >= 0;
