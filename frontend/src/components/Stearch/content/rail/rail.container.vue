<script setup lang="ts">
import { computed } from "vue";
import { selectTotal } from "../../Stearch.results.selectors";
import stearchStore from "../../Stearch.store";
import { useContentView } from "../content.view";
import RailPure from "./rail.pure-component.vue";
import { buildScrubActions, selectRailProps } from "./rail.selectors";

const store = stearchStore();
const { isScrubbing } = useContentView();
const props = computed(() => selectRailProps(store.state));

// Measured once per captured drag: each move's jump changes the DOM, so
// measuring on every move forced a layout.
let dragBox: DOMRect | null = null;

function railBox(rail: HTMLElement, event: PointerEvent): DOMRect {
  if (event.type === "pointerdown") {
    rail.setPointerCapture(event.pointerId);
    // A drag loads only where it stops; capture ends on release or cancel.
    isScrubbing.value = true;
    rail.addEventListener(
      "lostpointercapture",
      () => (isScrubbing.value = false),
      { once: true },
    );
    dragBox = rail.getBoundingClientRect();
    return dragBox;
  }
  // Capture ends on release, so a stale box is never reused for a later drag.
  if (dragBox !== null && rail.hasPointerCapture(event.pointerId)) {
    return dragBox;
  }
  return rail.getBoundingClientRect();
}

function onScrub(event: PointerEvent) {
  const rail = event.currentTarget;
  if (!(rail instanceof HTMLElement)) return;
  const { top, height } = railBox(rail, event);
  if (height === 0) return;
  store.dispatch(
    buildScrubActions((event.clientY - top) / height, selectTotal(store.state)),
  );
}
</script>

<template>
  <RailPure v-bind="props" @scrub="onScrub" />
</template>
