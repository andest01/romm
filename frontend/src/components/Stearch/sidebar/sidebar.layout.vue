<script setup lang="ts">
import type { SidebarLayoutProps } from "./sidebar.layout-props";

defineProps<SidebarLayoutProps>();
</script>

<template>
  <div class="stearch-sidebar">
    <header class="stearch-sidebar__header"><component :is="header" /></header>
    <div class="stearch-sidebar__body"><component :is="body" /></div>
    <footer v-if="footer" class="stearch-sidebar__footer">
      <component :is="footer" />
    </footer>
  </div>
</template>

<style scoped>
.stearch-sidebar {
  display: grid;
  grid-template:
    "header" auto
    "body" minmax(0, 1fr)
    "footer" auto
    / minmax(0, 1fr);
  height: 100%;
}
.stearch-sidebar__header {
  grid-area: header;
  border-bottom: 1px solid var(--r-color-border);
}
.stearch-sidebar__body {
  grid-area: body;
  display: flex;
  flex-direction: column;
  gap: var(--r-space-2);
  overflow: hidden auto;
  padding: var(--r-space-2);
}
.stearch-sidebar__footer {
  grid-area: footer;
  border-top: 1px solid var(--r-color-border);
}
</style>
