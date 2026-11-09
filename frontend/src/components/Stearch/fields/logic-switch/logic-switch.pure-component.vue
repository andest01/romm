<script setup lang="ts">
import { RBtn } from "@/lib";
import type { StearchAction } from "../../store/stearch.actions";
import type { LogicPreview } from "../fields.props";

defineProps<{ options: readonly LogicPreview[] }>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <div class="stearch-logic">
    <RBtn
      v-for="option in options"
      :key="option.id"
      :variant="option.isActive ? 'outlined' : 'text'"
      :aria-pressed="option.isActive"
      @click="$emit('press', option.actions)"
    >
      {{ option.label }}
    </RBtn>
  </div>
</template>

<style scoped>
.stearch-logic {
  display: flex;
  gap: 4px;
}
</style>
