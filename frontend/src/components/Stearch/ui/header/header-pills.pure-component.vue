<script setup lang="ts">
import { RBtn } from "@/lib";
import type { StearchAction } from "../../store/stearch.actions";
import FieldPill from "../fields/field-pill/field-pill.pure-component.vue";
import type { HeaderFilters } from "./header.props";

defineProps<Pick<HeaderFilters, "pills" | "clearLabel" | "clearActions">>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <div class="stearch-header-pills">
    <FieldPill
      v-for="pill in pills"
      :key="pill.id"
      :field="pill"
      @press="$emit('press', $event)"
    />
    <RBtn variant="text" @click="$emit('press', clearActions)">
      {{ clearLabel }}
    </RBtn>
  </div>
</template>

<style scoped>
.stearch-header-pills {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
}
</style>
