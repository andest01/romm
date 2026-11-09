<script setup lang="ts">
import RailValueView from "./rail-value/rail-value.pure-component.vue";
import type { RailEmits, RailProps } from "./rail.props";

defineProps<RailProps>();

defineEmits<RailEmits>();
</script>

<template>
  <div
    class="stearch-rail"
    role="toolbar"
    aria-orientation="vertical"
    :aria-label="label"
    @pointerdown="$emit('scrub', $event)"
    @pointermove="$event.buttons > 0 && $emit('scrub', $event)"
  >
    <button
      v-for="bucket in buckets"
      :key="bucket.key"
      type="button"
      class="stearch-rail__bucket"
      :tabindex="bucket.isCurrent ? 0 : -1"
      :data-current="bucket.isCurrent"
      :style="{ flexGrow: bucket.share }"
      :title="bucket.label"
      :aria-label="bucket.label"
      @click="$emit('press', bucket.position)"
      @keydown="$emit('key', $event)"
    >
      <RailValueView :value="bucket.value" />
    </button>
    <div
      class="stearch-rail__thumb"
      :style="{
        insetBlockStart: `${thumb.start * 100}%`,
        blockSize: `${thumb.size * 100}%`,
      }"
    />
  </div>
</template>

<style scoped>
/* The rail is the list's scrollbar: buckets are the track, and the thumb
   marks what's on screen. */
.stearch-rail__thumb {
  position: absolute;
  inset-inline: 0;
  min-block-size: 16px;
  border: 1px solid var(--r-color-brand-primary);
  border-radius: var(--r-radius-sm);
  background: color-mix(in srgb, var(--r-color-brand-primary) 20%, transparent);
  pointer-events: none;
}
.stearch-rail {
  position: relative;
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
  padding: 0;
  border: 0;
  background: transparent;
  cursor: inherit;
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
