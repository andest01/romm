<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { RTableColumn } from "@/lib";
import { selectAnchorPosition } from "../../Stearch.attention.selectors";
import {
  selectErrorMessage,
  selectIsLoading,
  selectSections,
} from "../../Stearch.results.selectors";
import { selectSlots } from "../../Stearch.rows.selectors";
import {
  selectSortDir,
  selectSortKey,
  selectVisiblePosition,
} from "../../Stearch.selectors";
import stearchStore from "../../Stearch.store";
import type { VisibleRange } from "../list/list.props";
import {
  buildScrollRows,
  buildWindowActions,
  headHeightFor,
  itemsPerScreen,
  withGhosts,
} from "../list/list.selectors";
import { useScrollerJump } from "../list/use-scroller-jump";
import Verbs from "../list/verbs/verbs.container.vue";
import RailContainer from "../rail/rail.container.vue";
import SectionContainer from "../section/section.container.vue";
import { selectSectionProps } from "../section/section.selectors";
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
const { t } = useI18n();
const store = stearchStore();
const headHeight = headHeightFor(false);
const rows = computed(() =>
  buildScrollRows(
    withGhosts(
      selectSlots(store.state),
      selectIsLoading(store.state),
      itemsPerScreen({ columns: 1, rowHeight: TABLE_ROW_HEIGHT }, box.value),
    ),
    1,
    selectSections(store.state),
  ),
);
const sortKey = computed(() => selectSortKey(store.state));
const sortDir = computed(() => selectSortDir(store.state));
const { setScroller, box, scrollbarWidth, bandOffset } = useScrollerJump(
  () => rows.value,
  () => TABLE_ROW_HEIGHT,
  () => headHeight,
  () => selectAnchorPosition(store.state),
);
const band = computed(() =>
  selectSectionProps(store.state) ? SectionContainer : null,
);
const errorMessage = computed(() => selectErrorMessage(store.state));

function onRange(range: VisibleRange): void {
  store.dispatch(
    buildWindowActions(range, rows.value, {
      previousPosition: selectVisiblePosition(store.state),
      itemsPerScreen: itemsPerScreen(
        { columns: 1, rowHeight: TABLE_ROW_HEIGHT },
        box.value,
      ),
    }),
  );
}
</script>

<template>
  <TablePure
    :item="RowPure"
    :verbs="Verbs"
    :set-scroller="setScroller"
    :band="band"
    :band-offset="bandOffset"
    :rail="RailContainer"
    :scrollbar-width="scrollbarWidth"
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
    @range="onRange"
  />
</template>
