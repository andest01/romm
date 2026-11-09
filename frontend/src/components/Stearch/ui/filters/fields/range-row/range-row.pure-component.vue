<script setup lang="ts">
import { RSlider } from "@/lib";
import {
  type FieldRange,
  RANGE_MAX_HOURS,
  type RangeChange,
} from "../../fields.props";

defineProps<{ range: FieldRange; minLabel: string; maxLabel: string }>();

defineEmits<{ range: [change: RangeChange] }>();

const STEP_HOURS = 5;
</script>

<template>
  <div class="stearch-range">
    <div class="stearch-range__row">
      <span>{{ minLabel }}</span>
      <RSlider
        :aria-label="minLabel"
        :model-value="range.min ?? 0"
        :min="0"
        :max="range.max ?? RANGE_MAX_HOURS"
        :step="STEP_HOURS"
        value-position="right"
        value-suffix=" h"
        @update:model-value="$emit('range', { bound: 'min', value: $event })"
      />
    </div>
    <div class="stearch-range__row">
      <span>{{ maxLabel }}</span>
      <RSlider
        :aria-label="maxLabel"
        :model-value="range.max ?? RANGE_MAX_HOURS"
        :min="range.min ?? 0"
        :max="RANGE_MAX_HOURS"
        :step="STEP_HOURS"
        value-position="right"
        value-suffix=" h"
        @update:model-value="$emit('range', { bound: 'max', value: $event })"
      />
    </div>
  </div>
</template>

<style scoped>
.stearch-range {
  display: grid;
  gap: var(--r-space-2);
}
.stearch-range__row {
  display: grid;
  gap: var(--r-space-1);
}
</style>
