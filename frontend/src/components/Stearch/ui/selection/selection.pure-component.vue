<script setup lang="ts">
import { RBtn } from "@/lib";
import type { StearchAction } from "../../store/stearch.actions";
import type { SelectionProps } from "./selection.props";

defineProps<SelectionProps>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <div class="stearch-selection">
    <template v-if="selectedCount > 0">
      <span>{{ selectedCount }} {{ selectedLabel }}</span>
      <RBtn variant="text" @click="$emit('press', clearActions)">
        {{ clearLabel }}
      </RBtn>
      <component :is="bulkAdd" v-if="bulkAdd" />
    </template>
    <span v-else>{{ resultCount }} {{ resultsLabel }}</span>
    <RBtn
      v-if="selectAllActions"
      variant="text"
      @click="$emit('press', selectAllActions)"
    >
      {{ selectAllLabel }} {{ resultCount }}
    </RBtn>
  </div>
</template>

<style scoped>
.stearch-selection {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
  min-height: 40px;
  padding: var(--r-space-2) var(--r-row-pad);
}
html[data-bp~="xs"] .stearch-selection {
  padding-inline: var(--r-space-2);
}
</style>
