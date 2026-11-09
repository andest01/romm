<script setup lang="ts">
import { computed, defineComponent, h } from "vue";
import { useI18n } from "vue-i18n";
import type { RTableColumn, RTableSortPayload } from "@/lib";
import {
  selectAnchorPosition,
  selectCurrentPosition,
} from "../../../store/attention.selectors";
import { selectGroupHeadings } from "../../../store/primary-group.selectors";
import {
  selectErrorMessage,
  selectIsLoading,
} from "../../../store/results.selectors";
import { selectSlots } from "../../../store/rows.selectors";
import { SORT_FIELDS } from "../../../store/sort.fields";
import {
  selectActiveId,
  selectSortDir,
  selectSortKey,
  selectVisiblePosition,
} from "../../../store/stearch.selectors";
import stearchStore from "../../../store/stearch.store";
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
import ResultsLayout from "../results.pure-layout.vue";
import { useContentView } from "../results.view";
import SectionContainer from "../section/section.container.vue";
import { selectSectionProps } from "../section/section.selectors";
import RowPure from "./row/row.pure-component.vue";
import TablePure from "./table.pure-component.vue";
import {
  buildSortActions,
  TABLE_HEAD_HEIGHT,
  TABLE_ROW_HEIGHT,
} from "./table.selectors";

// Stub labels: move to locale keys before this leaves the fork.
const TABLE_LABEL = "Games";
const COLUMNS: readonly RTableColumn[] = [
  { key: "name", label: SORT_FIELDS.name.label, sortable: true },
  { key: "platform", label: SORT_FIELDS.platform_id.label },
  {
    key: "fs_size_bytes",
    label: SORT_FIELDS.fs_size_bytes.label,
    sortable: true,
  },
  { key: "created_at", label: SORT_FIELDS.created_at.label, sortable: true },
  {
    key: "first_release_date",
    label: SORT_FIELDS.first_release_date.label,
    sortable: true,
  },
  {
    key: "average_rating",
    label: SORT_FIELDS.average_rating.label,
    sortable: true,
  },
  { key: "length", label: SORT_FIELDS.hltb_main_story.label },
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
    selectGroupHeadings(store.state),
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

const hasRows = computed(
  () => rows.value.length > 0 && errorMessage.value === null,
);
// The layout takes parts, so the grid is one, reading this container's state.
const Grid = defineComponent(
  () => () =>
    h(TablePure, {
      item: RowPure,
      verbs: Verbs,
      setScroller,
      tableLabel: TABLE_LABEL,
      activeDescendantId: activeDescendant.value,
      gridHelp: RESULTS_HELP,
      columns: COLUMNS,
      gridTemplate: GRID_TEMPLATE,
      rowHeight: TABLE_ROW_HEIGHT,
      headHeight,
      rows: rows.value,
      activePosition: activePosition.value,
      currentId: currentId.value,
      marks: feel.value.marks,
      sortKey: sortKey.value,
      sortDir: sortDir.value,
      errorMessage: errorMessage.value,
      emptyMessage: t("rom.no-games-match"),
      onPress: store.dispatch,
      onSort: (payload: RTableSortPayload) =>
        store.dispatch(buildSortActions(payload)),
      onRange,
      onKey,
    }),
);
</script>

<template>
  <ResultsLayout
    :grid="Grid"
    :rail="hasRows ? RailContainer : null"
    :band="hasRows ? band : null"
    :band-offset="bandOffset"
    :band-height="headHeight"
    :head-inset="TABLE_HEAD_HEIGHT"
    :scrollbar-width="scrollbarWidth"
  />
</template>
