<script setup lang="ts">
import { REmptyState, RSortHeader, RVirtualScroller } from "@/lib";
import type { RTableSortPayload } from "@/lib";
import type { ItemEmits } from "../list/item.props";
import type { VisibleRange } from "../list/list.props";
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
  <div class="stearch-table">
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
                  v-for="row in line.slots"
                  :key="row?.id"
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
      </div>
    </div>
  </div>
</template>

<style scoped>
.stearch-table {
  height: 100%;
  min-height: 0;
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
  flex: 1;
  min-height: 0;
}
</style>
