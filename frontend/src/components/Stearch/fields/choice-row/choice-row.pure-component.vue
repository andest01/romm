<script setup lang="ts">
import { RCheckbox } from "@/lib";
import type { StearchAction } from "../../store/actions";
import type { ChoicePreview } from "../fields.props";

defineProps<{ choice: ChoicePreview }>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <RCheckbox
    :model-value="choice.state === 'on'"
    :label="choice.label"
    hide-details
    @update:model-value="$emit('press', choice.actions)"
  />
</template>
