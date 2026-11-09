<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import romApi from "@/services/api/rom";
import StearchLayout from "./Stearch.pure-layout.vue";
import { buildLabels } from "./store/labels";
import { selectPanelLayout } from "./store/layout.selectors";
import stearchStore from "./store/stearch.store";
import ContentContainer from "./ui/content/content.container.vue";
import { useKeyDriver } from "./ui/content/list/use-key-driver";
import FooterContainer from "./ui/footer/footer.container.vue";
import HeaderContainer from "./ui/header/header.container.vue";
import ResultsHeading from "./ui/region-heading/results-heading.container.vue";
import SelectionHeading from "./ui/region-heading/selection-heading.container.vue";
import SidebarContainer from "./ui/sidebar/sidebar.container.vue";
import SkipLinkContainer from "./ui/skip-link/skip-link.container.vue";
import { createWaypointKeyDriver } from "./ui/waypoints.driver";

useKeyDriver(createWaypointKeyDriver());
const { t } = useI18n();
const store = stearchStore();
const panelLayout = computed(() => selectPanelLayout(store.state));

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
    :panel="SidebarContainer"
    :content="ContentContainer"
    :footer="FooterContainer"
    :background="null"
    :panel-layout="panelLayout"
    :skip-link="SkipLinkContainer"
    :results-heading="ResultsHeading"
    :selection-heading="SelectionHeading"
  />
</template>
