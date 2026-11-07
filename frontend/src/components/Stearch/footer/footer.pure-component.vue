<script setup lang="ts">
import { RBtn } from "@/lib";
import type { StearchAction } from "../Stearch.actions";
import type { FooterProps } from "./footer.props";

defineProps<FooterProps>();

defineEmits<{ press: [actions: readonly StearchAction[]] }>();
</script>

<template>
  <div class="stearch-footer">
    <template v-if="selectedCount > 0">
      <span>{{ selectedCount }} {{ selectedLabel }}</span>
      <RBtn variant="text" @click="$emit('press', clearActions)">
        {{ clearLabel }}
      </RBtn>
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
.stearch-footer {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
  min-height: 40px;
  padding: var(--r-space-2) var(--r-row-pad);
}
html[data-bp~="xs"] .stearch-footer {
  padding-inline: var(--r-space-2);
}
</style>
