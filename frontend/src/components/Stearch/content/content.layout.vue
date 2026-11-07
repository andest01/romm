<script setup lang="ts">
import type { ContentLayoutProps } from "./content.layout-props";

defineProps<ContentLayoutProps>();
</script>

<template>
  <div
    class="stearch-scroll"
    :style="{
      '--stearch-band-height': `${bandHeight}px`,
      '--stearch-band-inset': `${bandInset}px`,
      '--stearch-band-offset': `${bandOffset}px`,
    }"
  >
    <div class="stearch-scroll__items"><component :is="items" /></div>
    <div v-if="band" class="stearch-scroll__band">
      <div class="stearch-scroll__band-part"><component :is="band" /></div>
    </div>
    <div v-if="rail" class="stearch-scroll__rail">
      <component :is="rail" />
    </div>
  </div>
</template>

<style scoped>
/* Items take the whole width, so their scrollbar is the rightmost thing. The
   band and rail float over them; items pad clear with --stearch-rail-width. */
.stearch-scroll {
  --stearch-rail-width: 24px;
  /* Matches styles/scrollbar.css. */
  --stearch-scrollbar-width: 12px;
  position: relative;
  display: grid;
  overflow: hidden;
  height: 100%;
  grid-template:
    "items" minmax(0, 1fr)
    / minmax(0, 1fr);
}
.stearch-scroll__items {
  grid-area: items;
  min-height: 0;
}
.stearch-scroll__band {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  inset-block-start: var(--stearch-band-inset);
  inset-inline: 0 var(--stearch-scrollbar-width);
  block-size: var(--stearch-band-height);
}
.stearch-scroll__band-part {
  block-size: 100%;
  background: var(--r-color-surface);
  transform: translateY(var(--stearch-band-offset));
}
.stearch-scroll__rail {
  z-index: 2;
  grid-area: items;
  justify-self: end;
  width: var(--stearch-rail-width);
  min-height: 0;
  margin-inline-end: var(--stearch-scrollbar-width);
}
</style>
