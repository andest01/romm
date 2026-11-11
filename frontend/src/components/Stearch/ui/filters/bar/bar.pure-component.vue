<script setup lang="ts">
import { RBtn } from "@/lib";
import { FILTERS_HEADING_ID } from "../../../Stearch.pure-layout-props";
import type { ItemEmits } from "../../results/list/item.props";
import type { BarProps } from "../filters.props";

defineProps<BarProps>();

defineEmits<ItemEmits>();
</script>

<template>
  <div class="stearch-bar">
    <h2 v-if="title" :id="FILTERS_HEADING_ID" class="stearch-bar__title">
      {{ title }}
    </h2>
    <RBtn
      v-for="verb in verbs"
      :key="verb.id"
      variant="text"
      @click="$emit('press', verb.actions)"
    >
      {{ verb.label }}
    </RBtn>
  </div>
</template>

<style scoped>
.stearch-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--r-space-2);
  padding: var(--r-space-2);
}
.stearch-bar__title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: inherit;
  font-weight: 700;
}
</style>
