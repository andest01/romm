// The stick's state machine for one axis (specs 009, 010). The list runs it
// once; the 2D grid runs it per axis.

/** Where the active cell stands on one axis, against the band and the view.
 *  - `captured`: inside the band, and the view can move the way the stick
 *    pushes. The stick pans; the active cell hands over at the leading edge.
 *  - `pinned`: inside the band, but the view is at its limit that way, so it
 *    can't pan. The cell escapes the band by steps.
 *  - `free`: outside the band (a corner, or a mouse click far away). The
 *    cell walks by steps, and is captured again once it's back in the band. */
export type AxisState = "captured" | "pinned" | "free";

/** What the stick does on an axis in that state: move the view, or send
 *  steps exactly as a D-pad press would. */
export type AxisMode = "pan" | "step";

export const axisState = (
  isInsideBox: boolean,
  canPanToward: boolean,
): AxisState => (!isInsideBox ? "free" : canPanToward ? "captured" : "pinned");

export const axisMode = (state: AxisState): AxisMode =>
  state === "captured" ? "pan" : "step";

/** Whether a cell's middle is inside the band on one axis. */
export const isInsideBox = (
  index: number,
  centre: number,
  cellSize: number,
  boxCells: number,
): boolean =>
  Math.abs(centre - (index + 0.5) * cellSize) <= (boxCells * cellSize) / 2;

/** Whether the view can move further that way on one axis. */
export const canPan = (
  scroll: number,
  view: number,
  content: number,
  direction: number,
): boolean =>
  direction > 0 ? scroll < content - view - 0.5 : direction < 0 && scroll > 0.5;

/** Steps owed by a stick in step mode: speed accumulates, and each whole
 *  cell is one step, so a bigger push steps faster. */
export const stepsOwed = (
  carried: number,
  cellsPerSecond: number,
  frameMs: number,
): { steps: number; carried: number } => {
  const total = carried + (Math.abs(cellsPerSecond) * frameMs) / 1000;
  const steps = Math.floor(total);
  return { steps, carried: total - steps };
};
