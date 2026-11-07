<script setup lang="ts">
import { REmptyState, RVirtualScroller } from "@/lib";
import type { ItemEmits } from "./item.props";
import type { ListProps, VisibleRange } from "./list.props";

defineProps<ListProps>();

defineEmits<ItemEmits & { range: [range: VisibleRange] }>();
</script>

<template>
  <div
    class="stearch-list"
    :style="{ '--stearch-scrollbar-width': `${scrollbarWidth}px` }"
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
      :items="rows"
      :get-item-height="
        (_, index) => (rows[index]?.kind === 'head' ? headHeight : rowHeight)
      "
      @update:viewport-range="$emit('range', $event)"
    >
      <template #default="{ index }">
        <template v-for="line in rows.slice(index, index + 1)" :key="line.key">
          <div
            v-if="line.kind === 'head'"
            class="stearch-list__head"
            :style="{ height: `${headHeight}px` }"
          >
            {{ line.label }}
          </div>
          <div
            v-else
            class="stearch-list__row"
            :style="{
              height: `${rowHeight}px`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }"
          >
            <component
              :is="item"
              v-for="row in line.slots"
              :key="row?.id"
              :row="row"
              :verbs="verbs"
              @press="$emit('press', $event)"
            />
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
    <div v-if="rail" class="stearch-list__rail"><component :is="rail" /></div>
  </div>
</template>

<style scoped>
.stearch-list {
  --stearch-rail-width: 0px;
  position: relative;
  height: 100%;
  min-height: 0;
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
  background: var(--r-color-surface);
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
  font-size: 0.75em;
  font-weight: 700;
}
</style>
