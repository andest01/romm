<script setup lang="ts">
import { RBtn, RIcon } from "@/lib";
import type { StearchAction } from "../../Stearch.actions";
import type { ChoicePreview } from "../fields.props";

defineProps<{ choice: ChoicePreview }>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();

const ICONS = {
  off: "mdi-minus",
  on: "mdi-check",
  excluded: "mdi-close",
} as const;
</script>

<template>
  <RBtn
    class="stearch-tri-state"
    variant="text"
    :data-state="choice.state"
    @click="$emit('press', choice.actions)"
  >
    <RIcon :icon="ICONS[choice.state]" size="16" />
    {{ choice.label }}
  </RBtn>
</template>

<style scoped>
.stearch-tri-state {
  justify-content: flex-start;
  width: 100%;
}
.stearch-tri-state[data-state="off"] {
  opacity: 0.7;
}
</style>
