<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../store/stearch.store";
import FooterPure from "./footer.pure-component.vue";
import { selectFooterState } from "./footer.selectors";

// Stub labels: move to locale keys before this leaves the fork.
const RESULTS_LABEL = "games";
const SELECTED_LABEL = "selected";
const CLEAR_LABEL = "Clear";
const SELECT_ALL_LABEL = "Select all";

const store = stearchStore();
const footerState = computed(() => selectFooterState(store.state));
</script>

<template>
  <FooterPure
    v-bind="footerState"
    :results-label="RESULTS_LABEL"
    :selected-label="SELECTED_LABEL"
    :clear-label="CLEAR_LABEL"
    :select-all-label="SELECT_ALL_LABEL"
    @press="store.dispatch"
  />
</template>
