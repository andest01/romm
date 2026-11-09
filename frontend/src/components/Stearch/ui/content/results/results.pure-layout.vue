<script setup lang="ts">
import type { ResultsLayoutProps } from "./results.pure-layout-props";

defineProps<ResultsLayoutProps>();
</script>

<template>
  <div
    class="stearch-results"
    :style="{
      '--stearch-scrollbar-width': `${scrollbarWidth}px`,
      '--stearch-results-head': `${headInset}px`,
    }"
  >
    <div class="stearch-results__grid"><component :is="grid" /></div>
    <div v-if="rail" class="stearch-results__rail">
      <component :is="rail" />
    </div>
    <div
      v-if="band"
      class="stearch-results__band"
      :style="{ blockSize: `${bandHeight}px` }"
    >
      <div
        class="stearch-results__band-part"
        :style="{ transform: `translateY(${bandOffset}px)` }"
      >
        <component :is="band" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stearch-results {
  --stearch-rail-width: 0px;
  position: relative;
  height: 100%;
  min-height: 0;
}
/* Room for the rail only while there is one. */
.stearch-results:has(> .stearch-results__rail) {
  --stearch-rail-width: 24px;
}
.stearch-results__grid {
  height: 100%;
  min-height: 0;
}
/* The rail sits hard against the native scrollbar, so both can be grabbed. */
.stearch-results__rail {
  position: absolute;
  z-index: 2;
  inset-block: var(--stearch-results-head) 0;
  inset-inline-end: var(--stearch-scrollbar-width);
  inline-size: var(--stearch-rail-width);
  /* Opaque, so nothing a part draws can show through the rail. */
  background: var(--r-color-bg);
}
/* The band floats over the top of the grid, clipped to its own height, so a
   heading can push it out of view. It stops short of the scrollbar. */
.stearch-results__band {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  inset-block-start: var(--stearch-results-head);
  /* Stops at the rail, so the rail stays one unbroken column. */
  inset-inline: 0
    calc(var(--stearch-scrollbar-width) + var(--stearch-rail-width));
}
.stearch-results__band-part {
  block-size: 100%;
  background: var(--r-color-bg);
}
</style>
