<script setup lang="ts">
import { REmptyState, RVirtualScroller } from "@/lib";
import type { ItemEmits } from "./item.props";
import type { ListProps, VisibleRange } from "./list.props";

defineProps<ListProps>();

defineEmits<ItemEmits & { range: [range: VisibleRange] }>();
</script>

<template>
  <div class="stearch-list">
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
  </div>
</template>

<style scoped>
.stearch-list {
  height: 100%;
  min-height: 0;
}
.stearch-list__row,
.stearch-list__head {
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
