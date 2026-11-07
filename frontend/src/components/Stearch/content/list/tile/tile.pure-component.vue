<script setup lang="ts">
import GameCover from "@/components/shared/GameCover.vue";
import { RSkeletonBlock } from "@/lib";
import type { ItemEmits, ItemProps } from "../item.props";

defineProps<ItemProps>();

defineEmits<ItemEmits>();
</script>

<template>
  <div v-if="row === null" class="stearch-tile">
    <RSkeletonBlock width="28px" height="42px" />
    <div class="stearch-tile__text">
      <RSkeletonBlock width="70%" height="12px" />
      <RSkeletonBlock width="90%" height="10px" />
      <RSkeletonBlock width="50%" height="10px" />
    </div>
  </div>
  <div v-else class="stearch-tile__frame">
    <button
      type="button"
      class="stearch-tile"
      :aria-pressed="row.isSelected"
      @click="$emit('press', row.pressActions)"
      @mouseenter="$emit('press', row.hoverActions)"
      @focus="$emit('press', row.hoverActions)"
    >
      <GameCover
        class="stearch-tile__cover"
        :rom="row"
        :title="row.title"
        :identified="row.is_identified"
        responsive
      />
      <span class="stearch-tile__text">
        <span class="stearch-tile__line stearch-tile__title">
          <template v-for="(part, i) in row.titleParts" :key="i">
            <mark v-if="part.isMatch">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
        <span class="stearch-tile__line stearch-tile__meta">
          {{ row.platform_display_name }} · {{ row.year }} · {{ row.size }}
        </span>
        <span class="stearch-tile__line stearch-tile__meta">
          <template v-for="(part, i) in row.fileNameParts" :key="i">
            <mark v-if="part.isMatch">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
      </span>
    </button>
    <component :is="verbs" :rom="row" :is-compact="false" />
  </div>
</template>

<style scoped>
.stearch-tile__frame {
  display: flex;
  align-items: center;
  min-width: 0;
}
.stearch-tile__frame .stearch-tile {
  flex: 1;
  min-width: 0;
}
.stearch-tile {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
  width: 100%;
  height: 56px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--r-radius-md);
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.stearch-tile[aria-pressed="true"] {
  border-color: var(--r-color-border-strong);
}
.stearch-tile__cover {
  flex: none;
  width: 28px;
  height: 42px;
  border-radius: var(--r-radius-sm);
  background: var(--r-color-surface);
}
.stearch-tile__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.stearch-tile__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stearch-tile__title {
  font-weight: 600;
}
.stearch-tile__meta {
  font-size: 0.75em;
}
mark {
  background: none;
  color: var(--r-color-brand-primary);
  font-weight: 700;
}
</style>
