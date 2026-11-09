<script setup lang="ts">
defineProps<{ label: string; target: string }>();
</script>

<template>
  <a class="stearch-skip-link" :href="`#${target}`">{{ label }}</a>
</template>

<style scoped>
/* Off screen until the first Tab reaches it. */
.stearch-skip-link {
  position: absolute;
  z-index: 20;
  inset-block-start: var(--r-space-2);
  inset-inline-start: var(--r-space-2);
  padding: var(--r-space-2) var(--r-space-3);
  border-radius: var(--r-radius-sm);
  outline: 2px solid var(--r-color-brand-primary);
  background: var(--r-color-bg);
  color: var(--r-color-fg);
  transform: translateY(-200%);
}
.stearch-skip-link:focus {
  transform: none;
}
</style>
