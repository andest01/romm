<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import {
  selectAnchorPosition,
  selectCurrentPosition,
} from "../../Stearch.attention.selectors";
import {
  selectErrorMessage,
  selectIsLoading,
  selectSections,
} from "../../Stearch.results.selectors";
import { selectSlots } from "../../Stearch.rows.selectors";
import {
  selectActiveId,
  selectViewMode,
  selectVisiblePosition,
} from "../../Stearch.selectors";
import stearchStore from "../../Stearch.store";
import { useContentView } from "../content.view";
import RailContainer from "../rail/rail.container.vue";
import SectionContainer from "../section/section.container.vue";
import { selectSectionProps } from "../section/section.selectors";
import { useFeel } from "./feel";
import { RESULTS_HELP, type VisibleRange } from "./list.props";
import ListPure from "./list.pure-component.vue";
import {
  activeDescendantId,
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
const view = useContentView();
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
    selectSections(store.state),
  ),
);
const errorMessage = computed(() => selectErrorMessage(store.state));
const currentId = computed(() => selectActiveId(store.state));
const { activePosition, onKey } = useKeyFocus({
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
const visibleRange = shallowRef<VisibleRange | null>(null);
const describedItem = computed(() =>
  activeDescendantId(rows.value, activePosition.value, visibleRange.value),
);
function onRange(range: VisibleRange): void {
  visibleRange.value = range;
  store.dispatch(
    buildWindowActions(range, rows.value, {
      previousPosition: selectVisiblePosition(store.state),
      itemsPerScreen: itemsPerScreen(fit.value, box.value),
      pace: view.isScrubbing.value ? "when-still" : "keep-up",
      itemsPerSecond: speedOf(range, rows.value),
    }),
  );
}
</script>

<template>
  <ListPure
    v-bind="fit"
    :verbs="Verbs"
    :set-scroller="setScroller"
    :band="band"
    :band-offset="bandOffset"
    :rail="RailContainer"
    :scrollbar-width="scrollbarWidth"
    :rows="rows"
    :active-position="activePosition"
    :current-id="currentId"
    :marks="feel.marks"
    :grid-label="GRID_LABEL"
    :active-descendant-id="describedItem"
    :grid-help="RESULTS_HELP"
    :error-message="errorMessage"
    :empty-message="t('rom.no-games-match')"
    @press="store.dispatch"
    @range="onRange"
    @key="onKey"
  />
</template>
