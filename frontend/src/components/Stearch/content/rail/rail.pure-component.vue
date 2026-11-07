<script setup lang="ts">
import type { RailEmits, RailProps } from "./rail.props";

defineProps<RailProps>();

defineEmits<RailEmits>();
</script>

<template>
  <div
    class="stearch-rail"
    @pointerdown="$emit('scrub', $event)"
    @pointermove="$event.buttons > 0 && $emit('scrub', $event)"
  >
    <div
      v-for="bucket in buckets"
      :key="bucket.key"
      class="stearch-rail__bucket"
      :data-current="bucket.isCurrent"
      :style="{ flexGrow: bucket.share }"
      :title="bucket.label"
    >
      {{ bucket.label }}
    </div>
  </div>
</template>

<style scoped>
.stearch-rail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.stearch-rail:active {
  cursor: grabbing;
}
.stearch-rail__bucket {
  flex-shrink: 1;
  flex-basis: 0;
  overflow: hidden;
  min-height: 0;
  color: var(--r-color-brand-primary);
  font-size: 10px;
  font-weight: 650;
  text-align: center;
}
.stearch-rail__bucket:nth-child(even) {
  background: color-mix(in srgb, var(--r-color-brand-primary) 17%, transparent);
}
.stearch-rail__bucket[data-current="true"] {
  background: var(--r-color-brand-primary);
  color: var(--r-color-brand-on-primary);
}
</style>
