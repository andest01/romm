<script setup lang="ts">
import { computed } from "vue";
import { moveFocus } from "@/composables/useSpatialNav";
import { focusFromInput } from "@/utils/autofocus";
import { selectTotal } from "../../store/results.selectors";
import stearchStore from "../../store/stearch.store";
import { useContentView } from "../content.view";
import RailPure from "./rail.pure-component.vue";
import { buildScrubActions, selectRailProps } from "./rail.selectors";

const store = stearchStore();
const { isScrubbing } = useContentView();
const props = computed(() => selectRailProps(store.state));

const DRAG_THRESHOLD_PX = 4;

// Measured once per captured drag: each move's jump changes the DOM, so
// measuring on every move forced a layout.
let dragBox: DOMRect | null = null;
let pressY: number | null = null;

function startDrag(rail: HTMLElement, pointerId: number): void {
  rail.setPointerCapture(pointerId);
  // A drag loads only where it stops; capture ends on release or cancel.
  isScrubbing.value = true;
  rail.addEventListener(
    "lostpointercapture",
    () => (isScrubbing.value = false),
    { once: true },
  );
  dragBox = rail.getBoundingClientRect();
}

// Capture waits until the pointer moves, so a plain press still reaches its
// letter as a click. A rail with no letters is only a track, so it scrubs.
function isDragging(rail: HTMLElement, event: PointerEvent): boolean {
  if (rail.hasPointerCapture(event.pointerId)) return true;
  if (event.type === "pointerdown") {
    pressY = event.clientY;
    if (props.value.buckets.length > 0) return false;
  } else if (
    pressY === null ||
    Math.abs(event.clientY - pressY) < DRAG_THRESHOLD_PX
  ) {
    return false;
  }
  startDrag(rail, event.pointerId);
  return true;
}

function onScrub(event: PointerEvent) {
  const rail = event.currentTarget;
  if (!(rail instanceof HTMLElement) || !isDragging(rail, event)) return;
  if (dragBox === null || dragBox.height === 0) return;
  store.dispatch(
    buildScrubActions(
      (event.clientY - dragBox.top) / dragBox.height,
      selectTotal(store.state),
    ),
  );
}

// One tab stop: arrows walk the letters, and left or Esc returns to the results.
function onKey(event: KeyboardEvent) {
  const bucket = event.target;
  if (!(bucket instanceof HTMLElement)) return;
  if (event.key === "ArrowLeft" || event.key === "Escape") {
    event.preventDefault();
    moveFocus(bucket, "left");
    return;
  }
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  event.preventDefault();
  const next =
    event.key === "ArrowUp"
      ? bucket.previousElementSibling
      : bucket.nextElementSibling;
  if (next instanceof HTMLButtonElement) focusFromInput(next);
}
</script>

<template>
  <RailPure
    v-bind="props"
    @scrub="onScrub"
    @press="store.dispatch"
    @key="onKey"
  />
</template>
