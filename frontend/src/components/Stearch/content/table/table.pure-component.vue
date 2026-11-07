<script setup lang="ts">
import { REmptyState, RSortHeader, RVirtualScroller } from "@/lib";
import type { RTableSortPayload } from "@/lib";
import type { ItemEmits } from "../list/item.props";
import { SCROLLER_OVERSCAN, type VisibleRange } from "../list/list.props";
import type { TableProps } from "./table.props";

defineProps<TableProps>();

defineEmits<
  ItemEmits & {
    sort: [payload: RTableSortPayload];
    range: [range: VisibleRange];
  }
>();
</script>

<template>
  <div
    class="stearch-table"
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
    <div
      v-else
      class="stearch-table__grid"
      role="table"
      :aria-label="tableLabel"
    >
      <div
        class="stearch-table__head"
        role="row"
        :style="{ gridTemplateColumns: gridTemplate }"
      >
        <RSortHeader
          v-for="column in columns"
          :key="column.key"
          :label="column.label"
          :sortable="column.sortable"
          :active="column.key === sortKey"
          :dir="sortDir"
          @sort="$emit('sort', { key: column.key, dir: $event })"
        />
      </div>
      <div class="stearch-table__body">
        <RVirtualScroller
          :ref="setScroller"
          :items="rows"
          :overscan="SCROLLER_OVERSCAN"
          :get-item-height="
            (_, index) =>
              rows[index]?.kind === 'head' ? headHeight : rowHeight
          "
          @update:viewport-range="$emit('range', $event)"
        >
          <template #default="{ index }">
            <template
              v-for="line in rows.slice(index, index + 1)"
              :key="line.key"
            >
              <div
                v-if="line.kind === 'head'"
                class="stearch-table__section"
                :style="{ height: `${headHeight}px` }"
              >
                {{ line.label }}
              </div>
              <template v-else>
                <component
                  :is="item"
                  v-for="(row, column) in line.slots"
                  :key="column"
                  :row="row"
                  :verbs="verbs"
                  :grid-template="gridTemplate"
                  :cell-count="columns.length"
                  @press="$emit('press', $event)"
                />
              </template>
            </template>
          </template>
        </RVirtualScroller>
        <div
          v-if="band"
          class="stearch-table__band"
          :style="{ blockSize: `${headHeight}px` }"
        >
          <div
            class="stearch-table__band-part"
            :style="{ transform: `translateY(${bandOffset}px)` }"
          >
            <component :is="band" />
          </div>
        </div>
        <div v-if="rail" class="stearch-table__rail">
          <component :is="rail" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stearch-table {
  --stearch-rail-width: 0px;
  height: 100%;
  min-height: 0;
}
/* Room for the rail only while there is one. */
.stearch-table:has(.stearch-table__rail) {
  --stearch-rail-width: 24px;
}
/* The rail sits hard against the native scrollbar, below the column header,
   so both can be grabbed. */
.stearch-table__rail {
  position: absolute;
  z-index: 2;
  inset-block: 0;
  inset-inline-end: var(--stearch-scrollbar-width);
  inline-size: var(--stearch-rail-width);
}
.stearch-table__head,
.stearch-table__section {
  box-sizing: border-box;
  padding-inline: var(--r-row-pad) calc(var(--stearch-rail-width, 0px) + 6px);
}
.stearch-table__section {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--r-color-border);
  color: var(--r-color-brand-primary);
  font-size: 0.75em;
  font-weight: 700;
}
.stearch-table__grid {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.stearch-table__head {
  display: grid;
  flex: none;
  gap: var(--r-space-2);
  block-size: 30px;
  align-items: center;
}
.stearch-table__body {
  position: relative;
  flex: 1;
  min-height: 0;
}
/* One compositor layer per row made Layerize the top scroll cost. */
.stearch-table__body :deep(.r-virtual-scroller__item) {
  will-change: auto;
}
/* The band floats over the body, below the column header, clipped to its own
   height so a heading can push it out of view. */
.stearch-table__band {
  position: absolute;
  z-index: 1;
  overflow: hidden;
  inset-block-start: 0;
  inset-inline: 0 var(--stearch-scrollbar-width);
}
.stearch-table__band-part {
  block-size: 100%;
  background: var(--r-color-surface);
}
</style>
