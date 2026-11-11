<script setup lang="ts">
import { computed, defineComponent, h } from "vue";
import { useI18n } from "vue-i18n";
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
import {
  selectActiveId,
  selectViewMode,
  selectVisiblePosition,
} from "../../../store/stearch.selectors";
import stearchStore from "../../../store/stearch.store";
import RailContainer from "../rail/rail.container.vue";
import ResultsLayout from "../results.pure-layout.vue";
import { useResultsView } from "../results.view";
import SectionContainer from "../section/section.container.vue";
import { selectSectionProps } from "../section/section.selectors";
import { useFeel } from "./feel";
import { RESULTS_HELP, type VisibleRange } from "./list.props";
import ListPure from "./list.pure-component.vue";
import {
  buildScrollRows,
  buildWindowActions,
  itemKindFor,
  itemsPerScreen,
  listFitFor,
  withGhosts,
} from "./list.selectors";
import { useKeyFocus } from "./use-key-focus";
import { useListSpeed } from "./use-list-speed";
import { useScrollerJump } from "./use-scroller-jump";
import Verbs from "./verbs/verbs.container.vue";

// Stub label: move to a locale key before this leaves the fork.
const GRID_LABEL = "Games";
const { t } = useI18n();
const store = stearchStore();
const view = useResultsView();
const feel = useFeel("tiles");
const {
  setScroller,
  box,
  scrollbarWidth,
  bandOffset,
  follow,
  scrollerElement,
} = useScrollerJump(
  () => rows.value,
  () => fit.value.rowHeight,
  () => fit.value.headHeight,
  () => selectAnchorPosition(store.state),
  () => feel.value,
);
const band = computed(() =>
  selectSectionProps(store.state) ? SectionContainer : null,
);
// Size is a view fact: state gives the job, the DOM gives the room.
const fit = computed(() =>
  listFitFor(
    itemKindFor(view.device.value, selectViewMode(store.state)),
    view.device.value,
    box.value,
  ),
);
const rows = computed(() =>
  buildScrollRows(
    withGhosts(
      selectSlots(store.state),
      selectIsLoading(store.state),
      itemsPerScreen(fit.value, box.value),
    ),
    fit.value.columns,
    selectGroupHeadings(store.state),
  ),
);
const errorMessage = computed(() => selectErrorMessage(store.state));
const currentId = computed(() => selectActiveId(store.state));
const { activePosition, activeDescendant, noteRange, onKey } = useKeyFocus({
  rows: () => rows.value,
  start: () => selectAnchorPosition(store.state),
  currentPosition: () => selectCurrentPosition(store.state),
  feel: () => feel.value,
  rowHeight: () => fit.value.rowHeight,
  headHeight: () => fit.value.headHeight,
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
      itemsPerScreen: itemsPerScreen(fit.value, box.value),
      pace: view.isScrubbing.value ? "when-still" : "keep-up",
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
    h(ListPure, {
      ...fit.value,
      verbs: Verbs,
      setScroller,
      rows: rows.value,
      activePosition: activePosition.value,
      currentId: currentId.value,
      marks: feel.value.marks,
      gridLabel: GRID_LABEL,
      activeDescendantId: activeDescendant.value,
      gridHelp: RESULTS_HELP,
      errorMessage: errorMessage.value,
      emptyMessage: t("rom.no-games-match"),
      onPress: store.dispatch,
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
    :band-height="fit.headHeight"
    :head-inset="0"
    :scrollbar-width="scrollbarWidth"
  />
</template>
