<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import romApi from "@/services/api/rom";
import { buildLabels } from "./Stearch.labels";
import { selectPanelLayout } from "./Stearch.layout.selectors";
import StearchLayout from "./Stearch.pure-layout.vue";
import stearchStore from "./Stearch.store";
import ContentContainer from "./content/content.container.vue";
import FooterContainer from "./footer/footer.container.vue";
import HeaderContainer from "./header/header.container.vue";
import SidebarContainer from "./sidebar/sidebar.container.vue";

// Stub labels: move to locale keys before this leaves the fork.
const SKIP_LABEL = "Skip to results";
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
    :skip-label="SKIP_LABEL"
    panel-label="Filters"
    results-label="Results"
  />
</template>
