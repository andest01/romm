<script setup lang="ts">
defineProps<{ id: string; tag: "h1" | "h2" | "span"; text: string }>();
</script>

<template>
  <component :is="tag" :id="id" class="stearch-region-heading">
    {{ text }}
  </component>
</template>

<style scoped>
/* Read by screen readers only: the name a layout's landmark points at. */
.stearch-region-heading {
  position: absolute;
  overflow: hidden;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
