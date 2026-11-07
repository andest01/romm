<script setup lang="ts">
import GameCover from "@/components/shared/GameCover.vue";
import { RSkeletonBlock } from "@/lib";
import type { ItemEmits, ItemProps } from "../item.props";

defineProps<ItemProps>();

defineEmits<ItemEmits>();
</script>

<template>
  <div v-if="row === null" class="stearch-phone-cover">
    <RSkeletonBlock class="stearch-phone-cover__art" height="auto" />
    <RSkeletonBlock width="70%" height="10px" />
  </div>
  <div v-else class="stearch-phone-cover__frame">
    <button
      type="button"
      class="stearch-phone-cover"
      :aria-pressed="row.isSelected"
      @click="$emit('press', row.pressActions)"
    >
      <span class="stearch-phone-cover__art">
        <GameCover
          class="stearch-phone-cover__image"
          :rom="row"
          :title="row.title"
          :identified="row.is_identified"
          responsive
        />
        <span class="stearch-phone-cover__title">
          <template v-for="(part, i) in row.titleParts" :key="i">
            <mark v-if="part.isMatch">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
      </span>
      <span class="stearch-phone-cover__meta">
        {{ row.platform_display_name }} {{ row.year }}
      </span>
    </button>
    <component
      :is="verbs"
      class="stearch-phone-cover__verbs"
      :rom="row"
      :is-compact="true"
    />
  </div>
</template>

<style scoped>
.stearch-phone-cover__frame {
  position: relative;
  min-width: 0;
}
.stearch-phone-cover__verbs {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
}
.stearch-phone-cover {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 1px solid transparent;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.stearch-phone-cover[aria-pressed="true"] {
  border-color: var(--r-color-border-strong);
}
.stearch-phone-cover__art {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: var(--r-radius-sm);
  background: var(--r-color-surface);
}
.stearch-phone-cover__image {
  position: absolute;
  inset: 0;
}
.stearch-phone-cover__title {
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  display: -webkit-box;
  overflow: hidden;
  padding: 8px 2px 2px;
  background: linear-gradient(transparent, var(--r-color-bg));
  font-size: 7.5px;
  font-weight: 700;
  line-height: 1.2;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.stearch-phone-cover__meta {
  overflow: hidden;
  height: 13px;
  font-size: 9px;
  line-height: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
mark {
  background: none;
  color: var(--r-color-brand-primary);
}
</style>
