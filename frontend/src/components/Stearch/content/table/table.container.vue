<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { RTableColumn } from "@/lib";
import {
  selectErrorMessage,
  selectSections,
  selectSlots,
  selectSortDir,
  selectSortKey,
} from "../../Stearch.selectors";
import stearchStore from "../../Stearch.store";
import {
  buildScrollRows,
  buildWindowActions,
  headHeightFor,
} from "../list/list.selectors";
import Verbs from "../list/verbs/verbs.container.vue";
import { useScrollerJump } from "../use-scroller-jump";
import RowPure from "./row/row.pure-component.vue";
import TablePure from "./table.pure-component.vue";
import { buildSortActions, TABLE_ROW_HEIGHT } from "./table.selectors";

// Stub labels: move to locale keys before this leaves the fork.
const TABLE_LABEL = "Games";
const COLUMNS: readonly RTableColumn[] = [
  { key: "name", label: "Title", sortable: true },
  { key: "platform", label: "Platform" },
  { key: "fs_size_bytes", label: "Size", sortable: true },
  { key: "created_at", label: "Added", sortable: true },
  { key: "first_release_date", label: "Released", sortable: true },
  { key: "average_rating", label: "Rating", sortable: true },
  { key: "length", label: "Length" },
  { key: "languages", label: "Languages" },
  { key: "regions", label: "Regions" },
  { key: "verbs", label: "" },
];
const GRID_TEMPLATE =
  "minmax(0, 3fr) minmax(0, 1fr) 90px 100px 100px 80px 70px 90px 80px 64px";
const ROW_COLUMNS = 1;

const { t } = useI18n();
const store = stearchStore();
const headHeight = headHeightFor(false);
const rows = computed(() =>
  buildScrollRows(
    selectSlots(store.state),
    ROW_COLUMNS,
    selectSections(store.state),
  ),
);
const sortKey = computed(() => selectSortKey(store.state));
const sortDir = computed(() => selectSortDir(store.state));
const setScroller = useScrollerJump(
  () => rows.value,
  () => TABLE_ROW_HEIGHT,
  () => headHeight,
);
const errorMessage = computed(() => selectErrorMessage(store.state));
</script>

<template>
  <TablePure
    :item="RowPure"
    :verbs="Verbs"
    :set-scroller="setScroller"
    :table-label="TABLE_LABEL"
    :columns="COLUMNS"
    :grid-template="GRID_TEMPLATE"
    :row-height="TABLE_ROW_HEIGHT"
    :head-height="headHeight"
    :rows="rows"
    :sort-key="sortKey"
    :sort-dir="sortDir"
    :error-message="errorMessage"
    :empty-message="t('rom.no-games-match')"
    @press="store.dispatch"
    @sort="(payload) => store.dispatch(buildSortActions(payload))"
    @range="(range) => store.dispatch(buildWindowActions(range, rows))"
  />
</template>
