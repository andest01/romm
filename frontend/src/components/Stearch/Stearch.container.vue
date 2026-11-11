<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import romApi from "@/services/api/rom";
import StearchLayout from "./Stearch.pure-layout.vue";
import { selectEnteredPosition } from "./store/attention.selectors";
import { buildLabels } from "./store/labels";
import { selectFiltersLayout } from "./store/layout.selectors";
import stearchStore from "./store/stearch.store";
import FiltersContainer from "./ui/filters/filters.container.vue";
import HeaderHeading from "./ui/header/header-heading.container.vue";
import HeaderContainer from "./ui/header/header.container.vue";
import { useKeyDriver } from "./ui/results/list/use-key-driver";
import ResultsHeading from "./ui/results/results-heading.container.vue";
import ResultsContainer from "./ui/results/results.container.vue";
import SelectionHeading from "./ui/selection/selection-heading.container.vue";
import SelectionContainer from "./ui/selection/selection.container.vue";
import SkipLinkContainer from "./ui/skip-link/skip-link.container.vue";
import { createWaypointKeyDriver, enteredElement } from "./ui/waypoints.driver";

const { t } = useI18n();
const store = stearchStore();
const waypoints = createWaypointKeyDriver(() =>
  enteredElement(selectEnteredPosition(store.state)),
);
useKeyDriver(waypoints);
useEventListener(window, "gamepad:buttondown", ({ detail: { name } }) => {
  if (name === "rt") waypoints.hop(1);
  if (name === "lt") waypoints.hop(-1);
});
const filtersLayout = computed(() => selectFiltersLayout(store.state));

// The one watcher that dispatches, and an open question: labels change only
// when the language does. See "State comes from events" in AGENTS.md.
/* eslint-disable no-restricted-syntax */
watch(
  () => buildLabels(t),
  (labels) => store.dispatch([{ type: "locale/set", labels }]),
  { immediate: true },
);
/* eslint-enable no-restricted-syntax */
store.connect(romApi.getRoms);
onMounted(store.start);
</script>

<template>
  <StearchLayout
    :header="HeaderContainer"
    :filters="FiltersContainer"
    :results="ResultsContainer"
    :selection="SelectionContainer"
    :background="null"
    :filters-layout="filtersLayout"
    :skip-link="SkipLinkContainer"
    :header-heading="HeaderHeading"
    :results-heading="ResultsHeading"
    :selection-heading="SelectionHeading"
  />
</template>
