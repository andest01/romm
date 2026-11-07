<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { selectAnchorPosition } from "../../Stearch.attention.selectors";
import {
  selectErrorMessage,
  selectIsLoading,
  selectSections,
} from "../../Stearch.results.selectors";
import { selectSlots } from "../../Stearch.rows.selectors";
import { selectViewMode, selectVisiblePosition } from "../../Stearch.selectors";
import stearchStore from "../../Stearch.store";
import { useContentView } from "../content.view";
import RailContainer from "../rail/rail.container.vue";
import SectionContainer from "../section/section.container.vue";
import { selectSectionProps } from "../section/section.selectors";
import type { VisibleRange } from "./list.props";
import ListPure from "./list.pure-component.vue";
import {
  buildScrollRows,
  buildWindowActions,
  itemKindFor,
  itemsPerScreen,
  listFitFor,
  withGhosts,
} from "./list.selectors";
import { useScrollerJump } from "./use-scroller-jump";
import Verbs from "./verbs/verbs.container.vue";

const { t } = useI18n();
const store = stearchStore();
const view = useContentView();
const { setScroller, box, scrollbarWidth, bandOffset } = useScrollerJump(
  () => rows.value,
  () => fit.value.rowHeight,
  () => fit.value.headHeight,
  () => selectAnchorPosition(store.state),
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

function onRange(range: VisibleRange): void {
  store.dispatch(
    buildWindowActions(range, rows.value, {
      previousPosition: selectVisiblePosition(store.state),
      itemsPerScreen: itemsPerScreen(fit.value, box.value),
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
    :error-message="errorMessage"
    :empty-message="t('rom.no-games-match')"
    @press="store.dispatch"
    @range="onRange"
  />
</template>
