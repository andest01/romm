<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../store/stearch.store";
import BulkAdd from "./selection-bulk-add.container.vue";
import SelectionPure from "./selection.pure-component.vue";
import { selectSelectionState } from "./selection.selectors";

// Stub labels: move to locale keys before this leaves the fork.
const RESULTS_LABEL = "games";
const SELECTED_LABEL = "selected";
const CLEAR_LABEL = "Clear";
const SELECT_ALL_LABEL = "Select all";

const store = stearchStore();
const selectionState = computed(() => selectSelectionState(store.state));
</script>

<template>
  <SelectionPure
    v-bind="selectionState"
    :results-label="RESULTS_LABEL"
    :selected-label="SELECTED_LABEL"
    :clear-label="CLEAR_LABEL"
    :select-all-label="SELECT_ALL_LABEL"
    :bulk-add="BulkAdd"
    @press="store.dispatch"
  />
</template>
