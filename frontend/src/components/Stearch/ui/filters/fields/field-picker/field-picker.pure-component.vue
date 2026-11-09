<script setup lang="ts">
import type { StearchAction } from "../../../../store/stearch.actions";
import type { MultiFieldPreview } from "../../fields.props";
import ChoiceRow from "../choice-row/choice-row.pure-component.vue";
import LogicSwitch from "../logic-switch/logic-switch.pure-component.vue";

defineProps<{ field: MultiFieldPreview }>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <div class="stearch-picker">
    <LogicSwitch :options="field.logic" @press="$emit('press', $event)" />
    <ChoiceRow
      v-for="choice in field.choices"
      :key="choice.id"
      :choice="choice"
      @press="$emit('press', $event)"
    />
  </div>
</template>

<style scoped>
.stearch-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--r-space-2);
}
</style>
