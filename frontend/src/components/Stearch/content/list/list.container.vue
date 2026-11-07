<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { useBreakpoint } from "@/composables/useBreakpoint";
import {
  selectErrorMessage,
  selectIsAdvancedOpen,
  selectSections,
  selectSlots,
  selectViewMode,
} from "../../Stearch.selectors";
import stearchStore from "../../Stearch.store";
import { useScrollerJump } from "../use-scroller-jump";
import { LIST_ITEMS } from "./list.items";
import ListPure from "./list.pure-component.vue";
import {
  buildScrollRows,
  buildWindowActions,
  columnsFor,
  headHeightFor,
  rowHeightFor,
} from "./list.selectors";
import Verbs from "./verbs/verbs.container.vue";

const { t } = useI18n();
const { width: listWidth } = useElementSize(useTemplateRef("list"));
const { xs } = useBreakpoint();
const store = stearchStore();
const itemKind = computed(() => {
  if (!xs.value) return "tile";
  return selectViewMode(store.state) === "table" ? "phone-row" : "phone-cover";
});
const columns = computed(() =>
  columnsFor(itemKind.value, selectIsAdvancedOpen(store.state)),
);
const rows = computed(() =>
  buildScrollRows(
    selectSlots(store.state),
    columns.value,
    selectSections(store.state),
  ),
);
const rowHeight = computed(() => rowHeightFor(itemKind.value, listWidth.value));
const headHeight = computed(() => headHeightFor(xs.value));
const setScroller = useScrollerJump(
  () => rows.value,
  () => rowHeight.value,
  () => headHeight.value,
);
const errorMessage = computed(() => selectErrorMessage(store.state));
</script>

<template>
  <ListPure
    ref="list"
    :item="LIST_ITEMS[itemKind]"
    :verbs="Verbs"
    :set-scroller="setScroller"
    :columns="columns"
    :row-height="rowHeight"
    :head-height="headHeight"
    :rows="rows"
    :error-message="errorMessage"
    :empty-message="t('rom.no-games-match')"
    @press="store.dispatch"
    @range="(range) => store.dispatch(buildWindowActions(range, rows))"
  />
</template>
