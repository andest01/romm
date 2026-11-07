<script setup lang="ts">
import { RBtn } from "@/lib";
import type { ItemEmits } from "../list/item.props";
import type { SectionProps } from "./section.props";

defineProps<SectionProps>();

defineEmits<ItemEmits>();
</script>

<template>
  <div class="stearch-section-band">
    <strong class="stearch-section-band__label">{{ label }}</strong>
    <span class="stearch-section-band__count">{{ countLabel }}</span>
    <RBtn variant="text" size="x-small" @click="$emit('press', selectActions)">
      {{ selectLabel }}
    </RBtn>
    <RBtn variant="text" size="x-small" @click="$emit('press', prevActions)">
      {{ prevLabel }}
    </RBtn>
    <RBtn
      variant="text"
      size="x-small"
      :disabled="nextActions === null"
      @click="nextActions && $emit('press', nextActions)"
    >
      {{ nextLabel }}
    </RBtn>
  </div>
</template>

<style scoped>
.stearch-section-band {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
  box-sizing: border-box;
  block-size: 100%;
  padding-inline: var(--r-row-pad) calc(var(--stearch-rail-width, 0px) + 6px);
  border-bottom: 1px solid var(--r-color-border);
  font-size: 0.75em;
}
.stearch-section-band__label {
  color: var(--r-color-brand-primary);
}
.stearch-section-band__count {
  flex: 1;
  min-width: 0;
}
</style>
