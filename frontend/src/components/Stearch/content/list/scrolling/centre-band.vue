<script setup lang="ts">
// How a list moves under keys, as something a reader can drive. Not a part:
// it keeps view-only state. It runs the same code as tiles and table
// (followScrollTop, useGlide, useCruise), configured by one ScrollFeel.
import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import { markVariables } from "../list.props";
import {
  buildScrollRows,
  followScrollTop,
  stickRowsPerSecond,
} from "../list.selectors";
import { useCruise } from "../use-cruise";
import { useGlide } from "../use-glide";
import { readStickY, useStickScroll } from "../use-stick-scroll";
import { type FeelArgs, feelFromArgs } from "./feel.story-args";

const props = defineProps<
  FeelArgs & {
    follow: "feel" | "scroll into view (old)";
    /** Stands in for a pad's stick, -1 to 1. 0 reads a real pad. */
    stickStandIn: number;
    rowCount: number;
    rowHeight: number;
    viewportHeight: number;
    repeatMs: number;
  }
>();

const feel = computed(() => feelFromArgs(props));

// The feel as code, ready to paste over TILES_FEEL or TABLE_FEEL.
const feelAsCode = computed(() => JSON.stringify(feel.value, null, 2));

const viewport = shallowRef<HTMLElement | null>(null);
const active = ref(0);
const scrollTop = ref(0);
const isCruising = ref(false);
let holding: ReturnType<typeof setInterval> | null = null;

const numbers = computed(() =>
  Array.from({ length: props.rowCount }, (_, i) => i),
);
// The same row model as the real list: one item per row, no headings.
const scrollRows = computed(() =>
  buildScrollRows(
    Array.from({ length: props.rowCount }, () => null),
    1,
    [],
  ),
);
const bandHeight = computed(() => props.bandRows * props.rowHeight);
const bandInset = computed(() => (props.viewportHeight - bandHeight.value) / 2);
const activeTop = computed(() => active.value * props.rowHeight);
const isInsideBand = computed(() => {
  const top = activeTop.value - scrollTop.value;
  return (
    top >= bandInset.value - 0.5 &&
    top + props.rowHeight <= bandInset.value + bandHeight.value + 0.5
  );
});

const glide = useGlide();
const cruise = useCruise({
  feel: () => feel.value.cruise,
  scroller: () => viewport.value,
  rows: () => scrollRows.value,
  rowHeight: () => props.rowHeight,
  headHeight: () => 0,
  onRow: (rowIndex) => {
    isCruising.value = true;
    active.value = rowIndex;
  },
  onEnd: (rowIndex) => {
    isCruising.value = false;
    if (rowIndex === null) return;
    active.value = rowIndex;
    if (viewport.value) keepInView(viewport.value);
  },
});

// The stick, read live so the curve can be watched while it moves.
const stickReading = ref(0);
const deflection = (): number => {
  stickReading.value =
    props.stickStandIn !== 0 ? props.stickStandIn : readStickY();
  return stickReading.value;
};
const isSticking = ref(false);
const stick = useStickScroll({
  feel: () => (props.follow === "feel" ? feel.value.stick : null),
  bandRows: () => props.bandRows,
  scroller: () => viewport.value,
  rows: () => scrollRows.value,
  rowHeight: () => props.rowHeight,
  headHeight: () => 0,
  currentRow: () => active.value,
  deflection,
  loop: "always",
  onRow: (rowIndex) => {
    isSticking.value = true;
    active.value = rowIndex;
  },
  onStep: (key) => step(key === "ArrowDown" ? 1 : -1),
  onEnd: () => {
    isSticking.value = false;
  },
});
const stickSpeed = computed(() =>
  feel.value.stick
    ? stickRowsPerSecond(stickReading.value, feel.value.stick)
    : 0,
);

function keepInView(element: HTMLElement): void {
  if (props.follow === "feel") {
    const target = followScrollTop(
      { top: activeTop.value, height: props.rowHeight },
      {
        scrollTop: glide.heading(element),
        height: element.clientHeight,
        contentHeight: element.scrollHeight,
      },
      bandHeight.value,
    );
    glide.to(element, target, feel.value.glideMs);
    return;
  }
  const row = element.querySelector(`[data-row="${active.value}"]`);
  if (!(row instanceof HTMLElement)) return;
  const top = activeTop.value - element.scrollTop;
  if (top < 0 || top + props.rowHeight > element.clientHeight) {
    row.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function step(delta: 1 | -1): void {
  active.value = Math.min(
    Math.max(active.value + delta, 0),
    props.rowCount - 1,
  );
  if (viewport.value) keepInView(viewport.value);
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  stick.cancel();
  if (
    props.follow === "feel" &&
    cruise.feed(event.key, { via: "key", isRepeat: event.repeat })
  ) {
    return;
  }
  step(event.key === "ArrowDown" ? 1 : -1);
}

function onKeyUp(event: KeyboardEvent): void {
  cruise.keyUp(event.key);
}

// The buttons stand in for a held key: a press, then repeats at `repeatMs`,
// as a keyboard sends them.
function hold(key: "ArrowUp" | "ArrowDown"): void {
  release();
  const send = (repeat: boolean) =>
    viewport.value?.dispatchEvent(
      new KeyboardEvent("keydown", { key, repeat, bubbles: true }),
    );
  send(false);
  holding = setInterval(() => send(true), props.repeatMs);
  heldKey = key;
}

let heldKey: string | null = null;
function release(): void {
  if (holding !== null) clearInterval(holding);
  holding = null;
  if (heldKey !== null) cruise.keyUp(heldKey);
  heldKey = null;
}

onBeforeUnmount(release);
</script>

<template>
  <div class="centre-band">
    <div class="centre-band__stage" :style="{ height: `${viewportHeight}px` }">
      <div
        ref="viewport"
        class="centre-band__viewport"
        :style="markVariables(feel.marks)"
        tabindex="0"
        role="listbox"
        aria-label="Numbered rows"
        :aria-activedescendant="`centre-band-row-${active}`"
        @keydown="onKey"
        @keyup="onKeyUp"
        @scroll="scrollTop = ($event.target as HTMLElement).scrollTop"
      >
        <div
          v-for="row in numbers"
          :id="`centre-band-row-${row}`"
          :key="row"
          :data-row="row"
          role="option"
          :aria-selected="row === active"
          class="centre-band__row stearch-mark"
          :data-key-position="row === active"
          :data-current="row === active"
          :style="{ height: `${rowHeight}px` }"
        >
          Row {{ row }}
        </div>
      </div>
      <div
        class="centre-band__band"
        :class="{ 'centre-band__band--missed': !isInsideBand }"
        :style="{ top: `${bandInset}px`, height: `${bandHeight}px` }"
        aria-hidden="true"
      >
        <span>the band: the active row lives here</span>
      </div>
    </div>

    <div class="centre-band__panel">
      <div class="centre-band__buttons">
        <button
          type="button"
          @pointerdown="hold('ArrowUp')"
          @pointerup="release"
          @pointerleave="release"
        >
          Hold ↑
        </button>
        <button
          type="button"
          @pointerdown="hold('ArrowDown')"
          @pointerup="release"
          @pointerleave="release"
        >
          Hold ↓
        </button>
      </div>
      <dl class="centre-band__readout">
        <dt>Moving by</dt>
        <dd data-testid="mode">
          {{ isSticking ? "stick" : isCruising ? "cruise" : "steps" }}
        </dd>
        <dt>Stick</dt>
        <dd data-testid="stick">
          y {{ stickReading.toFixed(2) }} · {{ stickSpeed.toFixed(1) }} rows/s
        </dd>
        <dt>Active row</dt>
        <dd data-testid="active">{{ active }}</dd>
        <dt>scrollTop</dt>
        <dd data-testid="scroll-top">{{ Math.round(scrollTop) }}px</dd>
        <dt>Row offset in viewport</dt>
        <dd data-testid="offset">{{ Math.round(activeTop - scrollTop) }}</dd>
        <dt>Band</dt>
        <dd data-testid="band">
          {{ Math.round(bandInset) }} to
          {{ Math.round(bandInset + bandHeight) }}px from the viewport top
        </dd>
        <dt>Inside the band</dt>
        <dd data-testid="inside">{{ isInsideBand ? "yes" : "no" }}</dd>
        <dt>Feel</dt>
        <dd>
          glide {{ glideMs }} ms ·
          {{
            hasCruise
              ? `cruise ${cruiseStartRowsPerSecond} → ${cruiseMaxRowsPerSecond} rows/s over ${cruiseRampMs} ms`
              : "no cruise"
          }}
        </dd>
      </dl>
      <p>
        Keys and the D-pad are discrete: a tap moves one row, and the view
        follows with the glide (<strong>0 ms is a jump cut</strong>). The left
        stick is analog: push a little and the list creeps, push hard and it
        flies; the row at the centre becomes active once the list is a dead band
        past it, and letting go leaves the view where it is. Set the toolbar's
        Input to Gamepad to use a real pad, or drag the stand-in slider.
      </p>
      <details class="centre-band__code">
        <summary>This feel as code</summary>
        <pre data-testid="feel-code">{{ feelAsCode }}</pre>
      </details>
    </div>
  </div>
</template>

<style scoped>
.centre-band {
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 320px);
  gap: var(--r-space-6);
  padding: var(--r-space-6);
  color: var(--r-color-fg);
}
.centre-band__stage {
  position: relative;
}
.centre-band__viewport {
  height: 100%;
  overflow-y: auto;
  /* An outline, not a border, so the band and the scroller measure the same height. */
  outline: 1px solid var(--r-color-border);
  border-radius: var(--r-radius-md);
}
.centre-band__viewport:focus-visible {
  outline: 2px solid var(--r-color-brand-primary);
  outline-offset: 2px;
}
.centre-band__row {
  display: flex;
  align-items: center;
  padding-inline: var(--r-space-4);
  border-block-end: 1px solid var(--r-color-border);
}
.centre-band__band {
  position: absolute;
  inset-inline: 0;
  border: 2px dashed var(--r-color-success);
  background: color-mix(in srgb, var(--r-color-success) 10%, transparent);
  pointer-events: none;
}
.centre-band__band--missed {
  border-color: var(--r-color-danger);
  background: color-mix(in srgb, var(--r-color-danger) 10%, transparent);
}
.centre-band__band span {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: var(--r-space-2);
  font-size: 0.75rem;
  color: var(--r-color-fg-secondary);
}
.centre-band__buttons {
  display: flex;
  gap: var(--r-space-3);
  margin-block-end: var(--r-space-4);
}
.centre-band__readout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--r-space-1) var(--r-space-4);
  margin-block-end: var(--r-space-4);
}
.centre-band__code pre {
  overflow: auto;
  max-block-size: 240px;
  font-size: 0.75rem;
}
.centre-band__readout dt {
  color: var(--r-color-fg-secondary);
}
</style>

<style scoped src="../marks.css"></style>
