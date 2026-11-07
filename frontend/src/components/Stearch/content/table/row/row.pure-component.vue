<script setup lang="ts">
import { RSkeletonBlock } from "@/lib";
import type { ItemEmits } from "../../list/item.props";
import type { RowProps } from "./row.props";

defineProps<RowProps>();

defineEmits<ItemEmits>();
</script>

<template>
  <div
    v-if="row === null"
    class="stearch-row"
    role="row"
    :style="{ gridTemplateColumns: gridTemplate }"
  >
    <div v-for="n in cellCount" :key="n" role="cell">
      <RSkeletonBlock width="70%" height="10px" />
    </div>
  </div>
  <div
    v-else
    class="stearch-row"
    role="row"
    tabindex="0"
    :data-selected="row.isSelected"
    :style="{ gridTemplateColumns: gridTemplate }"
    @click="$emit('press', row.pressActions)"
    @keydown.enter="$emit('press', row.pressActions)"
    @mouseenter="$emit('press', row.hoverActions)"
    @focus="$emit('press', row.hoverActions)"
  >
    <div role="cell" class="stearch-row__cell">
      <template v-for="(part, i) in row.titleParts" :key="i">
        <mark v-if="part.isMatch">{{ part.text }}</mark>
        <template v-else>{{ part.text }}</template>
      </template>
    </div>
    <div role="cell" class="stearch-row__cell">
      {{ row.platform_display_name }}
    </div>
    <div role="cell" class="stearch-row__cell">{{ row.size }}</div>
    <div role="cell" class="stearch-row__cell">{{ row.added }}</div>
    <div role="cell" class="stearch-row__cell">{{ row.released }}</div>
    <div role="cell" class="stearch-row__cell">{{ row.rating }}</div>
    <div role="cell" class="stearch-row__cell">{{ row.length }}</div>
    <div role="cell" class="stearch-row__cell">{{ row.languagesLabel }}</div>
    <div role="cell" class="stearch-row__cell">{{ row.regionsLabel }}</div>
    <div role="cell">
      <component :is="verbs" :rom="row" :is-compact="false" />
    </div>
  </div>
</template>

<style scoped>
.stearch-row {
  display: grid;
  align-items: center;
  gap: var(--r-space-2);
  box-sizing: border-box;
  height: 30px;
  padding-inline: var(--r-row-pad) calc(var(--stearch-rail-width, 0px) + 6px);
  border-bottom: 1px solid var(--r-color-border);
  cursor: pointer;
}
.stearch-row[data-selected="true"] {
  background: var(--r-color-surface);
}
.stearch-row__cell {
  overflow: hidden;
  font-size: 0.8em;
  text-overflow: ellipsis;
  white-space: nowrap;
}
mark {
  background: none;
  color: var(--r-color-brand-primary);
  font-weight: 700;
}
</style>
