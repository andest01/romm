<script setup lang="ts">
import { computed } from "vue";
import {
  FILTERS_REGION_ID,
  RESULTS_REGION_ID,
} from "../../Stearch.pure-layout-props";
import { selectIsAdvancedOpen } from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";
import SkipLinkPure from "./skip-link.pure-component.vue";

// Stub labels: move to locale keys before this leaves the fork.
const RESULTS_LABEL = "Skip to results";
const FILTERS_LABEL = "Skip to filters";
const store = stearchStore();
const isFiltersOpen = computed(() => selectIsAdvancedOpen(store.state));
</script>

<template>
  <SkipLinkPure :label="RESULTS_LABEL" :target="RESULTS_REGION_ID" />
  <SkipLinkPure
    v-if="isFiltersOpen"
    :label="FILTERS_LABEL"
    :target="FILTERS_REGION_ID"
  />
</template>
