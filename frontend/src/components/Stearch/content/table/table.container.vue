<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { RTableColumn } from "@/lib";
import {
  selectAnchorPosition,
  selectCurrentPosition,
} from "../../store/attention.selectors";
import {
  selectErrorMessage,
  selectIsLoading,
  selectSections,
} from "../../store/results.selectors";
import { selectSlots } from "../../store/rows.selectors";
import {
  selectActiveId,
  selectSortDir,
  selectSortKey,
  selectVisiblePosition,
} from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";
import { useContentView } from "../content.view";
import { useFeel } from "../list/feel";
import { RESULTS_HELP, type VisibleRange } from "../list/list.props";
import {
  buildScrollRows,
  buildWindowActions,
  headHeightFor,
  itemsPerScreen,
  withGhosts,
} from "../list/list.selectors";
import { useKeyFocus } from "../list/use-key-focus";
import { useListSpeed } from "../list/use-list-speed";
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
  { key: "verbs", label: "Actions" },
];
const GRID_TEMPLATE =
  "minmax(0, 3fr) minmax(0, 1fr) 90px 100px 100px 80px 70px 90px 80px 64px";
const { t } = useI18n();
const store = stearchStore();
const { isScrubbing } = useContentView();
const feel = useFeel("table");
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
const {
  setScroller,
  box,
  scrollbarWidth,
  bandOffset,
  follow,
  scrollerElement,
} = useScrollerJump(
  () => rows.value,
  () => TABLE_ROW_HEIGHT,
  () => headHeight,
  () => selectAnchorPosition(store.state),
  () => feel.value,
);
const band = computed(() =>
  selectSectionProps(store.state) ? SectionContainer : null,
);
const errorMessage = computed(() => selectErrorMessage(store.state));
const currentId = computed(() => selectActiveId(store.state));
const { activePosition, activeDescendant, noteRange, onKey } = useKeyFocus({
  rows: () => rows.value,
  start: () => selectAnchorPosition(store.state),
  currentPosition: () => selectCurrentPosition(store.state),
  feel: () => feel.value,
  rowHeight: () => TABLE_ROW_HEIGHT,
  headHeight: () => headHeight,
  scroller: scrollerElement,
  follow,
  dispatch: store.dispatch,
});

const speedOf = useListSpeed();
function onRange(range: VisibleRange): void {
  noteRange(range);
  store.dispatch(
    buildWindowActions(range, rows.value, {
      previousPosition: selectVisiblePosition(store.state),
      itemsPerScreen: itemsPerScreen(
        { columns: 1, rowHeight: TABLE_ROW_HEIGHT },
        box.value,
      ),
      pace: isScrubbing.value ? "when-still" : "keep-up",
      itemsPerSecond: speedOf(range, rows.value),
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
    :active-descendant-id="activeDescendant"
    :grid-help="RESULTS_HELP"
    :columns="COLUMNS"
    :grid-template="GRID_TEMPLATE"
    :row-height="TABLE_ROW_HEIGHT"
    :head-height="headHeight"
    :rows="rows"
    :active-position="activePosition"
    :current-id="currentId"
    :marks="feel.marks"
    :sort-key="sortKey"
    :sort-dir="sortDir"
    :error-message="errorMessage"
    :empty-message="t('rom.no-games-match')"
    @press="store.dispatch"
    @sort="(payload) => store.dispatch(buildSortActions(payload))"
    @range="onRange"
    @key="onKey"
  />
</template>
