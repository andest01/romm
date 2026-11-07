<script setup lang="ts">
import type { StearchAction } from "../../Stearch.actions";
import FieldPicker from "../field-picker/field-picker.pure-component.vue";
import type {
  MultiFieldPreview,
  RangeChange,
  RangeFieldPreview,
  TriStateFieldPreview,
} from "../fields.props";
import RangeRow from "../range-row/range-row.pure-component.vue";
import TriStateRow from "../tri-state-row/tri-state-row.pure-component.vue";

defineProps<{
  field: MultiFieldPreview | TriStateFieldPreview | RangeFieldPreview;
  minLabel: string;
  maxLabel: string;
}>();

defineEmits<{
  press: [actions: readonly StearchAction[]];
  range: [change: RangeChange];
}>();
</script>

<template>
  <TriStateRow
    v-if="field.kind === 'tri-state'"
    :choice="field.choice"
    @press="$emit('press', $event)"
  />
  <section v-else class="stearch-section">
    <h3 class="stearch-section__title">{{ field.label }}</h3>
    <FieldPicker
      v-if="field.kind === 'multi'"
      :field="field"
      @press="$emit('press', $event)"
    />
    <RangeRow
      v-else
      :range="field.range"
      :min-label="minLabel"
      :max-label="maxLabel"
      @range="$emit('range', $event)"
    />
  </section>
</template>

<style scoped>
.stearch-section__title {
  margin: 0;
  font-size: 0.8em;
  font-weight: 600;
}
</style>
