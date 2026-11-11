<script setup lang="ts">
import {
  type HeaderLayoutProps,
  SEARCH_LABEL_ID,
} from "./header.pure-layout-props";

defineProps<HeaderLayoutProps>();
</script>

<template>
  <div class="stearch-header">
    <div class="stearch-header__row">
      <div
        class="stearch-header__search"
        role="search"
        :aria-labelledby="SEARCH_LABEL_ID"
        data-waypoint="search"
      >
        <component :is="search" />
      </div>
      <div class="stearch-header__controls" data-waypoint="controls">
        <component :is="controls" />
      </div>
    </div>
    <div v-if="pills" class="stearch-header__pills">
      <component :is="pills" />
    </div>
  </div>
</template>

<style scoped>
.stearch-header {
  display: flex;
  flex-direction: column;
  gap: var(--r-space-2);
  padding: var(--r-space-2) var(--r-row-pad);
}
.stearch-header__row {
  /* The sort button answers to the header's own width. */
  container-type: inline-size;
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
}
.stearch-header__search {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--r-space-2);
  min-width: 0;
}
.stearch-header__controls {
  flex: none;
}
.stearch-header__pills {
  overflow-x: auto;
}
html[data-bp~="xs"] .stearch-header {
  padding-inline: var(--r-space-2);
}
html[data-bp~="xs"] .stearch-header__row {
  flex-wrap: wrap;
}
</style>
