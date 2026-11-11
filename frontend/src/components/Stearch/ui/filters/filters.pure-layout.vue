<script setup lang="ts">
import type { FiltersLayoutProps } from "./filters.pure-layout-props";

defineProps<FiltersLayoutProps>();
</script>

<template>
  <div class="stearch-filters">
    <div class="stearch-filters__header"><component :is="header" /></div>
    <div class="stearch-filters__body"><component :is="body" /></div>
    <div v-if="footer" class="stearch-filters__footer">
      <component :is="footer" />
    </div>
  </div>
</template>

<style scoped>
.stearch-filters {
  display: grid;
  grid-template:
    "header" auto
    "body" minmax(0, 1fr)
    "footer" auto
    / minmax(0, 1fr);
  height: 100%;
}
.stearch-filters__header {
  grid-area: header;
  border-bottom: 1px solid var(--r-color-border);
}
.stearch-filters__body {
  grid-area: body;
  display: flex;
  flex-direction: column;
  gap: var(--r-space-2);
  overflow: hidden auto;
  padding: var(--r-space-2);
}
.stearch-filters__footer {
  grid-area: footer;
  border-top: 1px solid var(--r-color-border);
}
</style>
