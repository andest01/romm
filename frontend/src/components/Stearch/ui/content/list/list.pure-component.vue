<script setup lang="ts">
import { REmptyState, RVirtualScroller } from "@/lib";
import type { ItemEmits } from "./item.props";
import {
  type ListProps,
  markVariables,
  RESULTS_HELP_ID,
  SCROLLER_OVERSCAN,
  type VisibleRange,
} from "./list.props";
import { itemDomId } from "./list.selectors";

defineProps<ListProps>();

defineEmits<
  ItemEmits & { range: [range: VisibleRange]; key: [event: KeyboardEvent] }
>();
</script>

<template>
  <div
    class="stearch-list"
    :style="{
      '--stearch-scrollbar-width': `${scrollbarWidth}px`,
      ...markVariables(marks),
    }"
  >
    <REmptyState
      v-if="errorMessage"
      icon="mdi-alert-circle-outline"
      :title="errorMessage"
    />
    <REmptyState
      v-else-if="rows.length === 0"
      icon="mdi-magnify-close"
      :title="emptyMessage"
    />
    <RVirtualScroller
      v-else
      :ref="setScroller"
      class="stearch-list__scroller"
      role="grid"
      :aria-label="gridLabel"
      :aria-activedescendant="activeDescendantId ?? undefined"
      :aria-rowcount="rows.length"
      :aria-describedby="RESULTS_HELP_ID"
      tabindex="0"
      :items="rows"
      :overscan="SCROLLER_OVERSCAN"
      :get-item-height="
        (_, index) => (rows[index]?.kind === 'head' ? headHeight : rowHeight)
      "
      @update:viewport-range="$emit('range', $event)"
      @keydown="$emit('key', $event)"
    >
      <template #default="{ index }">
        <template v-for="line in rows.slice(index, index + 1)" :key="line.key">
          <div
            v-if="line.kind === 'head'"
            class="stearch-list__head"
            role="row"
            :aria-rowindex="index + 1"
            :style="{ height: `${headHeight}px` }"
          >
            <span role="gridcell">{{ line.label }}</span>
          </div>
          <div
            v-else
            class="stearch-list__row"
            role="row"
            :aria-rowindex="index + 1"
            :style="{
              height: `${rowHeight}px`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }"
          >
            <div
              v-for="(row, column) in line.slots"
              :id="itemDomId(line.position + column)"
              :key="column"
              class="stearch-list__cell"
              role="gridcell"
              :aria-selected="row !== null && row.isSelected"
            >
              <component
                :is="item"
                :row="row"
                :verbs="verbs"
                class="stearch-mark"
                :data-key-position="line.position + column === activePosition"
                :data-current="row !== null && row.id === currentId"
                :data-selected="row !== null && row.isSelected"
                @press="$emit('press', $event)"
              />
            </div>
          </div>
        </template>
      </template>
    </RVirtualScroller>
    <div
      v-if="band"
      class="stearch-list__band"
      :style="{ blockSize: `${headHeight}px` }"
    >
      <div
        class="stearch-list__band-part"
        :style="{ transform: `translateY(${bandOffset}px)` }"
      >
        <component :is="band" />
      </div>
    </div>
    <p :id="RESULTS_HELP_ID" class="stearch-results-help">{{ gridHelp }}</p>
    <div v-if="rail" class="stearch-list__rail"><component :is="rail" /></div>
  </div>
</template>

<style scoped>
/* A role wrapper only: the item stays the row's grid child. */
.stearch-list__cell {
  display: contents;
}
.stearch-list {
  --stearch-rail-width: 0px;
  position: relative;
  /* Items are picked, not read: Shift and drag must not select text. */
  user-select: none;
  height: 100%;
  min-height: 0;
}
/* One compositor layer per row made Layerize the top scroll cost. */
.stearch-list__scroller :deep(.r-virtual-scroller__item) {
  will-change: auto;
}
/* Ghosts hold still. Each skeleton's shimmer is a gradient repainted every
   frame, and a screen of ghosts ran hundreds of them during a scroll. */
.stearch-list__row :deep(.r-skeleton::after) {
  content: none;
}
/* Room for the rail only while there is one. */
.stearch-list:has(> .stearch-list__rail) {
  --stearch-rail-width: 24px;
}
/* The rail sits hard against the native scrollbar, so both can be grabbed. */
.stearch-list__rail {
  position: absolute;
  z-index: 2;
  inset-block: 0;
  inset-inline-end: var(--stearch-scrollbar-width);
  inline-size: var(--stearch-rail-width);
}
/* The band floats over the top of the scroller, clipped to its own height,
   so a heading can push it out of view. It stops short of the scrollbar. */
.stearch-list__band {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  inset-block-start: 0;
  inset-inline: 0 var(--stearch-scrollbar-width);
}
.stearch-list__band-part {
  block-size: 100%;
  background: var(--r-color-bg);
}
/* Padding sits on the scroller, so its content box is the items' width. */
.stearch-list__scroller {
  box-sizing: border-box;
  padding-inline: var(--r-row-pad) calc(var(--stearch-rail-width, 0px) + 6px);
}
.stearch-list__row {
  display: grid;
  gap: 6px;
}
.stearch-list__head {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--r-color-border);
  color: var(--r-color-brand-primary);
  font-size: 1em;
  font-weight: 800;
}
</style>

<style scoped src="./marks.css"></style>
