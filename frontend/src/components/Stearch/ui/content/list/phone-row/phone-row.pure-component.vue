<script setup lang="ts">
import GameCover from "@/components/shared/GameCover.vue";
import { RSkeletonBlock } from "@/lib";
import type { ItemEmits, ItemProps } from "../item.props";

defineProps<ItemProps>();

defineEmits<ItemEmits>();
</script>

<template>
  <div v-if="row === null" class="stearch-phone-row">
    <RSkeletonBlock width="26px" height="38px" />
    <div class="stearch-phone-row__text">
      <RSkeletonBlock width="70%" height="12px" />
      <RSkeletonBlock width="50%" height="10px" />
    </div>
  </div>
  <div v-else class="stearch-phone-row__frame">
    <button
      type="button"
      class="stearch-phone-row"
      :aria-pressed="row.isSelected"
      @click.exact="$emit('press', row.pressActions)"
      @click.ctrl.exact="$emit('press', row.selectActions)"
      @click.meta.exact="$emit('press', row.selectActions)"
    >
      <GameCover
        class="stearch-phone-row__cover"
        :rom="row"
        :title="row.title"
        :identified="row.is_identified"
        responsive
      />
      <span class="stearch-phone-row__text">
        <span class="stearch-phone-row__line stearch-phone-row__title">
          <template v-for="(part, i) in row.titleParts" :key="i">
            <mark v-if="part.isMatch">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
        <span class="stearch-phone-row__line stearch-phone-row__meta">
          {{ row.platform_display_name }} · {{ row.year }} · {{ row.size }}
        </span>
      </span>
    </button>
    <component :is="verbs" :rom="row" :is-compact="false" />
  </div>
</template>

<style scoped>
.stearch-phone-row__frame {
  display: flex;
  align-items: center;
  min-width: 0;
}
.stearch-phone-row__frame .stearch-phone-row {
  flex: 1;
  min-width: 0;
}
.stearch-phone-row {
  display: flex;
  align-items: center;
  gap: var(--r-space-2);
  width: 100%;
  height: 52px;
  padding: 0;
  border: 1px solid transparent;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.stearch-phone-row[aria-pressed="true"] {
  border-color: var(--r-color-border-strong);
}
.stearch-phone-row__cover {
  flex: none;
  width: 26px;
  height: 38px;
  border-radius: var(--r-radius-sm);
  background: var(--r-color-surface);
}
.stearch-phone-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.stearch-phone-row__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stearch-phone-row__title {
  font-weight: 600;
}
.stearch-phone-row__meta {
  font-size: 0.75em;
}
mark {
  background: none;
  color: var(--r-color-brand-primary);
  font-weight: 700;
}
</style>
