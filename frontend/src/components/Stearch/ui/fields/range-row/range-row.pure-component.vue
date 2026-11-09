<script setup lang="ts">
import { RTextField } from "@/lib";
import type { FieldRange, RangeChange } from "../fields.props";

defineProps<{ range: FieldRange; minLabel: string; maxLabel: string }>();

defineEmits<{ range: [change: RangeChange] }>();
</script>

<template>
  <div class="stearch-range">
    <RTextField
      type="number"
      :label="minLabel"
      :model-value="range.min"
      @update:model-value="$emit('range', { bound: 'min', value: $event })"
    />
    <RTextField
      type="number"
      :label="maxLabel"
      :model-value="range.max"
      @update:model-value="$emit('range', { bound: 'max', value: $event })"
    />
  </div>
</template>

<style scoped>
.stearch-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--r-space-2);
}
</style>
