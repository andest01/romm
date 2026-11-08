<script setup lang="ts">
// The two-axis spike (spec 009), as something a reader can drive. Not a
// part: it keeps view-only state. The D-pad (and arrow keys) moves the
// active cell one step; the left stick pans and the active cell catches up
// inside the centre box; Space or Enter toggles the selection.
import { useElementSize, useEventListener } from "@vueuse/core";
import { computed, onMounted, reactive, ref, shallowRef, watch } from "vue";
import { PAD_BUTTON } from "@/composables/useGamepad";
import { RBtn } from "@/lib";
import { focusFromInput } from "@/utils/autofocus";
import { followScrollTop } from "../list.selectors";
import FsmLive from "./fsm-live.vue";
import {
  type AxisState,
  axisState,
  canPan,
  type Cell,
  centreTarget,
  type Grid2dFeel,
  isInsideBox,
  isMovingAway,
  mountedSpan,
  moveCell,
  pushLength,
  stickVelocity,
  type Vector,
} from "./grid-2d.selectors";
import { readStick, useStickScroll2d } from "./use-stick-scroll-2d";

const props = defineProps<
  Grid2dFeel & {
    rows: number;
    cols: number;
    cellSize: number;
    /** Stand in for a pad's stick, -1 to 1 each. 0 and 0 read a real pad. */
    standInX: number;
    standInY: number;
  }
>();

const RING = 2;
const LOG_SIZE = 8;
const AXIS_NAMES = { x: "columns", y: "rows" } as const;
const viewport = shallowRef<HTMLElement | null>(null);
const active = ref<Cell>({ row: 0, col: 0 });
const selected = ref<ReadonlySet<string>>(new Set());
const scroll = ref({ top: 0, left: 0 });
const stickReading = ref<Vector>({ x: 0, y: 0 });

const feel = computed((): Grid2dFeel => ({
  boxRows: props.boxRows,
  boxCols: props.boxCols,
  deadzone: props.deadzone,
  minCellsPerSecond: props.minCellsPerSecond,
  maxCellsPerSecond: props.maxCellsPerSecond,
  gamma: props.gamma,
}));
// The grid fills whatever canvas it's given, so it measures its viewport.
// The content box excludes the scrollbars, which is the space cells get.
const view = useElementSize(viewport);
const keyOf = ({ row, col }: Cell) => `${row}:${col}`;
const nameOf = ({ row, col }: Cell) => `r${row} c${col}`;

// Only the visible cells and a ring around them are mounted.
const cells = computed(() => {
  const rows = mountedSpan(
    scroll.value.top,
    view.height.value,
    props.cellSize,
    props.rows,
    RING,
  );
  const cols = mountedSpan(
    scroll.value.left,
    view.width.value,
    props.cellSize,
    props.cols,
    RING,
  );
  const mounted: Cell[] = [];
  for (let row = rows.first; row <= rows.last; row++) {
    for (let col = cols.first; col <= cols.last; col++) {
      mounted.push({ row, col });
    }
  }
  return mounted;
});

const box = computed(() => ({
  width: props.boxCols * props.cellSize,
  height: props.boxRows * props.cellSize,
}));
// The two bands: the horizontal band is the box's rows across the full
// width, the vertical band its columns down the full height. The box is
// where they cross. Each axis is captured by its own band.
const inBands = computed(() => ({
  y: isInsideBox(
    active.value.row,
    scroll.value.top + view.height.value / 2,
    props.cellSize,
    props.boxRows,
  ),
  x: isInsideBox(
    active.value.col,
    scroll.value.left + view.width.value / 2,
    props.cellSize,
    props.boxCols,
  ),
}));
const isActiveInBox = computed(() => inBands.value.x && inBands.value.y);

// The way each axis last moved: "can the view move further" needs a direction.
const facing = reactive({ x: 1, y: 1 });
const axisStates = computed((): { x: AxisState; y: AxisState } => ({
  y: axisState(
    inBands.value.y,
    canPan(
      scroll.value.top,
      view.height.value,
      props.rows * props.cellSize,
      facing.y,
    ),
  ),
  x: axisState(
    inBands.value.x,
    canPan(
      scroll.value.left,
      view.width.value,
      props.cols * props.cellSize,
      facing.x,
    ),
  ),
}));
const previousStates = reactive<{ x: AxisState | null; y: AxisState | null }>({
  x: null,
  y: null,
});

const log = ref<{ id: number; text: string }[]>([]);
let lastLogId = 0;
function note(text: string): void {
  log.value = [{ id: ++lastLogId, text }, ...log.value].slice(0, LOG_SIZE);
}

watch(axisStates, (now, before) => {
  for (const axis of ["y", "x"] as const) {
    if (now[axis] === before[axis]) continue;
    previousStates[axis] = before[axis];
    note(`${AXIS_NAMES[axis]}: ${before[axis]} to ${now[axis]}`);
  }
});

const stick = useStickScroll2d({
  feel: () => feel.value,
  scroller: () => viewport.value,
  cellSize: () => props.cellSize,
  size: () => ({ rows: props.rows, cols: props.cols }),
  current: () => active.value,
  deflection: () => {
    const isStandingIn = props.standInX !== 0 || props.standInY !== 0;
    const reading = isStandingIn
      ? { x: props.standInX, y: props.standInY }
      : readStick();
    // A new object every frame would re-render the whole grid at idle.
    if (
      reading.x !== stickReading.value.x ||
      reading.y !== stickReading.value.y
    ) {
      stickReading.value = reading;
    }
    const velocity = stickVelocity(stickReading.value, feel.value);
    if (velocity.x !== 0) facing.x = Math.sign(velocity.x);
    if (velocity.y !== 0) facing.y = Math.sign(velocity.y);
    return stickReading.value;
  },
  loop: "always",
  onCell: (cell) => {
    syncScroll();
    active.value = cell;
    note(`stick: hand over to ${nameOf(cell)}`);
  },
  onStep: (key) => step(key, "stick"),
});
const speed = computed(() =>
  pushLength(stickVelocity(stickReading.value, feel.value)),
);

// Keeps the active cell inside the box on both axes: the list's follow,
// run once per axis.
function follow(element: HTMLElement, axis: "x" | "y"): void {
  if (axis === "y") {
    element.scrollTop = followScrollTop(
      { top: active.value.row * props.cellSize, height: props.cellSize },
      {
        scrollTop: element.scrollTop,
        height: element.clientHeight,
        contentHeight: element.scrollHeight,
      },
      box.value.height,
    );
    return;
  }
  element.scrollLeft = followScrollTop(
    { top: active.value.col * props.cellSize, height: props.cellSize },
    {
      scrollTop: element.scrollLeft,
      height: element.clientWidth,
      contentHeight: element.scrollWidth,
    },
    box.value.width,
  );
}

function toggleSelected(cell: Cell): void {
  const next = new Set(selected.value);
  if (next.has(keyOf(cell))) next.delete(keyOf(cell));
  else next.add(keyOf(cell));
  selected.value = next;
}

// Scroll events arrive a frame late. Whatever moves the view and the active
// cell together calls this, so the axis states never see one without the other.
function syncScroll(): void {
  if (!viewport.value) return;
  scroll.value = {
    top: viewport.value.scrollTop,
    left: viewport.value.scrollLeft,
  };
}

function setActive(cell: Cell): void {
  active.value = cell;
}

function addSelected(cell: Cell): void {
  selected.value = new Set(selected.value).add(keyOf(cell));
}

function flyTo(target: Vector): void {
  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  viewport.value?.scrollTo({
    left: target.x,
    top: target.y,
    behavior: isReduced.matches ? "instant" : "smooth",
  });
}

function flyToCentre(cell: Cell): void {
  if (!viewport.value) return;
  flyTo(
    centreTarget(cell, props.cellSize, {
      width: viewport.value.clientWidth,
      height: viewport.value.clientHeight,
    }),
  );
}

const targets = computed(() => {
  const bottom = props.rows - 1;
  const right = props.cols - 1;
  return [
    { label: "top left", cell: { row: 0, col: 0 } },
    { label: "top right", cell: { row: 0, col: right } },
    {
      label: "middle",
      cell: {
        row: Math.floor(props.rows / 2),
        col: Math.floor(props.cols / 2),
      },
    },
    { label: "bottom left", cell: { row: bottom, col: 0 } },
    { label: "bottom right", cell: { row: bottom, col: right } },
  ];
});

// What the outside world can ask for: data only, screen only, or both.
type GridAction =
  | { type: "attention/set"; patch: { active: Cell } }
  | { type: "selection/add"; cell: Cell }
  | { type: "view/flyTo"; cell: Cell };

const setActiveAction = (cell: Cell): GridAction => ({
  type: "attention/set",
  patch: { active: cell },
});
const flyToAction = (cell: Cell): GridAction => ({ type: "view/flyTo", cell });
const addSelectedAction = (cell: Cell): GridAction => ({
  type: "selection/add",
  cell,
});

const COMMANDS: readonly {
  name: string;
  actions: (cell: Cell) => GridAction[];
}[] = [
  {
    name: "navigateTo",
    actions: (cell) => [setActiveAction(cell), flyToAction(cell)],
  },
  { name: "setActive", actions: (cell) => [setActiveAction(cell)] },
  { name: "flyTo", actions: (cell) => [flyToAction(cell)] },
  { name: "addSelected", actions: (cell) => [addSelectedAction(cell)] },
];

const actionTypes = (actions: GridAction[]): string =>
  actions.map(({ type }) => type).join(", ");

function dispatch(actions: GridAction[]): void {
  for (const action of actions) {
    if (action.type === "attention/set") setActive(action.patch.active);
    else if (action.type === "selection/add") addSelected(action.cell);
    else flyToCentre(action.cell);
  }
}

function runCommand(command: (typeof COMMANDS)[number], cell: Cell): void {
  const actions = command.actions(cell);
  stick.cancel();
  dispatch(actions);
  note(`command: ${nameOf(cell)}: ${actionTypes(actions)}`);
  focusFromInput(viewport.value, { preventScroll: true });
}

// False while a debug button has focus, so a press only activates that button.
function isGridFocused(): boolean {
  const focused = document.activeElement;
  return focused === document.body || !!viewport.value?.contains(focused);
}

function onKey(event: KeyboardEvent): void {
  if (event.key === " " || event.key === "Enter") {
    if (!isGridFocused()) return;
    event.preventDefault();
    toggleSelected(active.value);
    return;
  }
  if (
    event.key !== "ArrowUp" &&
    event.key !== "ArrowDown" &&
    event.key !== "ArrowLeft" &&
    event.key !== "ArrowRight"
  ) {
    return;
  }
  event.preventDefault();
  stick.cancel();
  step(event.key, "key or D-pad");
}

// One D-pad step, from a key, the D-pad, or the stick where it can't pan:
// all three arrive here, so they behave the same.
// A step scrolls only along its own axis. Heading for the band it just walks,
// so the view doesn't yank; at or past the centre, the view follows.
function step(
  key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
  source: string,
) {
  const axis = key === "ArrowUp" || key === "ArrowDown" ? "y" : "x";
  const direction = key === "ArrowUp" || key === "ArrowLeft" ? -1 : 1;
  facing[axis] = direction;
  active.value = moveCell(active.value, key, {
    rows: props.rows,
    cols: props.cols,
  });
  const element = viewport.value;
  if (element) {
    const isAway =
      axis === "y"
        ? isMovingAway(
            active.value.row,
            direction,
            element.scrollTop + element.clientHeight / 2,
            props.cellSize,
          )
        : isMovingAway(
            active.value.col,
            direction,
            element.scrollLeft + element.clientWidth / 2,
            props.cellSize,
          );
    if (isAway) follow(element, axis);
  }
  syncScroll();
  note(`${source}: step to ${nameOf(active.value)}`);
}

// On the window: the D-pad's arrow keys land on whatever has focus, and a
// panning stick can unmount the focused cell, dropping focus to the page.
useEventListener(window, "keydown", onKey);

// The pad's A selects, as Space does.
useEventListener(window, "gamepad:buttondown", (event) => {
  if (event.detail.index !== PAD_BUTTON.a) return;
  if (!isGridFocused()) return;
  toggleSelected(active.value);
});

// Focus lands on the grid when it opens, so keys and the D-pad work at once.
// The window first: in Storybook the grid sits in a frame, and keys go to
// whichever frame has focus (the sidebar's, after picking a story).
onMounted(() => {
  focusFromInput(window);
  focusFromInput(viewport.value, { preventScroll: true });
});

function onPress(cell: Cell, event: MouseEvent): void {
  if (event.ctrlKey || event.metaKey) {
    toggleSelected(cell);
    note(`mouse: toggle selected ${nameOf(cell)}`);
    return;
  }
  active.value = cell;
  note(`mouse: setActive(${nameOf(cell)})`);
}

function onScroll(event: Event): void {
  const element = event.target;
  if (!(element instanceof HTMLElement)) return;
  scroll.value = { top: element.scrollTop, left: element.scrollLeft };
}

const feelAsCode = computed(() => JSON.stringify(feel.value, null, 2));
</script>

<template>
  <div class="grid-2d">
    <div class="grid-2d__debug">
      <div class="grid-2d__commands">
        <div
          v-for="command in COMMANDS"
          :key="command.name"
          class="grid-2d__command"
          role="group"
          :aria-label="command.name"
        >
          <code>{{ command.name }}</code>
          <span class="grid-2d__dispatches">{{
            actionTypes(command.actions(active))
          }}</span>
          <div class="grid-2d__targets">
            <RBtn
              v-for="target in targets"
              :key="target.label"
              variant="outlined"
              size="small"
              :aria-label="`${command.name} ${target.label}`"
              :title="`${command.name}(${nameOf(target.cell)})`"
              @click="runCommand(command, target.cell)"
            >
              {{ target.label }}
            </RBtn>
          </div>
        </div>
      </div>
      <FsmLive
        label="rows"
        :state="axisStates.y"
        :previous="previousStates.y"
      />
      <FsmLive
        label="columns"
        :state="axisStates.x"
        :previous="previousStates.x"
      />
      <ol class="grid-2d__log" aria-label="What just happened">
        <li v-for="entry in log" :key="entry.id">{{ entry.text }}</li>
      </ol>
    </div>
    <div class="grid-2d__stage">
      <div
        ref="viewport"
        class="grid-2d__viewport"
        tabindex="0"
        role="listbox"
        aria-label="A 128 by 128 grid"
        @scroll="onScroll"
      >
        <div
          class="grid-2d__plane"
          :style="{
            width: `${cols * cellSize}px`,
            height: `${rows * cellSize}px`,
          }"
        >
          <button
            v-for="cell in cells"
            :key="keyOf(cell)"
            v-memo="[
              keyOf(cell) === keyOf(active),
              selected.has(keyOf(cell)),
              cellSize,
            ]"
            type="button"
            role="option"
            :aria-selected="selected.has(keyOf(cell))"
            tabindex="-1"
            class="grid-2d__cell stearch-mark"
            :data-current="keyOf(cell) === keyOf(active)"
            :data-key-position="keyOf(cell) === keyOf(active)"
            :data-selected="selected.has(keyOf(cell))"
            :style="{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              transform: `translate(${cell.col * cellSize}px, ${cell.row * cellSize}px)`,
            }"
            @click="onPress(cell, $event)"
          >
            r{{ cell.row }} c{{ cell.col }}
          </button>
        </div>
      </div>
      <div
        class="grid-2d__band"
        :class="{ 'grid-2d__band--missed': !inBands.y }"
        :style="{
          width: `${view.width.value}px`,
          height: `${box.height}px`,
          insetBlockStart: `${view.height.value / 2}px`,
          insetInlineStart: `${view.width.value / 2}px`,
        }"
        aria-hidden="true"
      />
      <div
        class="grid-2d__band"
        :class="{ 'grid-2d__band--missed': !inBands.x }"
        :style="{
          width: `${box.width}px`,
          height: `${view.height.value}px`,
          insetBlockStart: `${view.height.value / 2}px`,
          insetInlineStart: `${view.width.value / 2}px`,
        }"
        aria-hidden="true"
      />
      <div
        class="grid-2d__box"
        :class="{ 'grid-2d__box--missed': !isActiveInBox }"
        :style="{
          width: `${box.width}px`,
          height: `${box.height}px`,
          insetBlockStart: `${view.height.value / 2}px`,
          insetInlineStart: `${view.width.value / 2}px`,
        }"
        aria-hidden="true"
      />
      <div class="grid-2d__corner">
        <details class="grid-2d__panel">
          <summary>Readout</summary>
          <dl class="grid-2d__readout">
            <dt>Active cell</dt>
            <dd data-testid="active">r{{ active.row }} c{{ active.col }}</dd>
            <dt>Selected</dt>
            <dd data-testid="selected">{{ selected.size }}</dd>
            <dt>Stick</dt>
            <dd data-testid="stick">
              x {{ stickReading.x.toFixed(2) }} · y
              {{ stickReading.y.toFixed(2) }} · {{ speed.toFixed(1) }} cells/s
            </dd>
            <dt>Inside the box</dt>
            <dd data-testid="inside">{{ isActiveInBox ? "yes" : "no" }}</dd>
            <dt>In the bands</dt>
            <dd data-testid="bands">
              horizontal {{ inBands.y ? "yes" : "no" }} · vertical
              {{ inBands.x ? "yes" : "no" }}
            </dd>
            <dt>Axis states</dt>
            <dd data-testid="states">
              rows {{ axisStates.y }} · columns {{ axisStates.x }}
            </dd>
          </dl>
          <p>
            Arrows or the D-pad move one cell. The left stick pans in any
            direction, and the active cell catches up inside the box. Space,
            Enter or pad A selects; Ctrl-click selects with the mouse. No pad?
            Use the stand-in sliders.
          </p>
        </details>
        <details class="grid-2d__panel">
          <summary>This feel as code</summary>
          <pre class="grid-2d__code">{{ feelAsCode }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Fills whatever canvas it's given; the readout floats over a corner. */
.grid-2d {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  color: var(--r-color-fg);
}
.grid-2d__debug {
  display: flex;
  flex-wrap: wrap;
  gap: var(--r-space-2) var(--r-space-4);
  max-block-size: 40vh;
  overflow: auto;
  padding: var(--r-space-2);
  font-size: 0.75rem;
}
.grid-2d__commands {
  display: grid;
  gap: var(--r-space-1);
}
.grid-2d__command {
  display: grid;
  grid-template-columns: 6rem 1fr;
  align-items: center;
  column-gap: var(--r-space-2);
}
.grid-2d__dispatches {
  color: var(--r-color-fg-secondary);
}
.grid-2d__targets {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--r-space-1);
}
.grid-2d__log {
  flex: 1 1 200px;
  /* Always full height: a growing log would move the stage's centre line. */
  block-size: 8lh;
  overflow: hidden;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--r-color-fg-secondary);
}
.grid-2d__stage {
  position: relative;
  flex: 1;
  min-block-size: 0;
}
.grid-2d__viewport {
  position: absolute;
  inset: 0;
  overflow: auto;
  outline: 1px solid var(--r-color-border);
  user-select: none;
}
.grid-2d__viewport:focus-visible {
  outline: 2px solid var(--r-color-brand-primary);
}
.grid-2d__plane {
  position: relative;
}
.grid-2d__cell {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  padding: 0;
  border: 0;
  border-inline-end: 1px solid var(--r-color-border);
  border-block-end: 1px solid var(--r-color-border);
  color: var(--r-color-fg-secondary);
  font-size: 0.6rem;
  cursor: pointer;
}
/* Centred on the viewport's content box, not the stage, so the scrollbars
   don't pull it off the centre line the stick measures from. */
.grid-2d__box {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 2px dashed var(--r-color-success);
  pointer-events: none;
}
/* The two bands the box is the crossing of, drawn faintly: green while the
   active cell is inside that band, red while it's outside. */
.grid-2d__band {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 1px solid color-mix(in srgb, var(--r-color-success) 45%, transparent);
  background: color-mix(in srgb, var(--r-color-success) 9%, transparent);
  pointer-events: none;
}
.grid-2d__band--missed {
  border-color: color-mix(in srgb, var(--r-color-danger) 45%, transparent);
  background: color-mix(in srgb, var(--r-color-danger) 9%, transparent);
}
.grid-2d__box--missed {
  border-color: var(--r-color-danger);
}
/* Two tabs stacked in the top corner, clear of the scrollbar. */
.grid-2d__corner {
  position: absolute;
  z-index: 1;
  inset-block-start: var(--r-space-3);
  inset-inline-end: calc(var(--r-space-3) + 16px);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--r-space-1);
  max-inline-size: min(320px, calc(100% - 2 * var(--r-space-3) - 16px));
  max-block-size: calc(100% - 2 * var(--r-space-3) - 16px);
}
.grid-2d__panel {
  max-block-size: 50vh;
  overflow: auto;
  padding: var(--r-space-1) var(--r-space-2);
  border-radius: var(--r-radius-sm);
  background: color-mix(in srgb, var(--r-color-bg) 85%, transparent);
  font-size: 0.75rem;
}
.grid-2d__panel[open] {
  inline-size: min(320px, 100%);
}
.grid-2d__panel > summary {
  cursor: pointer;
  color: var(--r-color-fg-secondary);
}
.grid-2d__readout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--r-space-1) var(--r-space-4);
  margin-block-end: var(--r-space-4);
}
.grid-2d__readout dt {
  color: var(--r-color-fg-secondary);
}
.grid-2d__code {
  overflow: auto;
  font-size: 0.75rem;
}
</style>

<style scoped src="../marks.css"></style>
