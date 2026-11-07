<script setup lang="ts">
import { computed } from "vue";
import { selectTotal } from "../../Stearch.selectors";
import stearchStore from "../../Stearch.store";
import RailPure from "./rail.pure-component.vue";
import { buildScrubActions, selectRailProps } from "./rail.selectors";

const store = stearchStore();
const props = computed(() => selectRailProps(store.state));

function onScrub(event: PointerEvent) {
  const rail = event.currentTarget;
  if (!(rail instanceof HTMLElement)) return;
  if (event.type === "pointerdown") rail.setPointerCapture(event.pointerId);
  const { top, height } = rail.getBoundingClientRect();
  store.dispatch(
    buildScrubActions((event.clientY - top) / height, selectTotal(store.state)),
  );
}
</script>

<template>
  <RailPure v-bind="props" @scrub="onScrub" />
</template>
