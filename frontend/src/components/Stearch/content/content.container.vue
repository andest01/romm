<script setup lang="ts">
import { computed } from "vue";
import { selectViewMode } from "../Stearch.selectors";
import stearchStore from "../Stearch.store";
import { provideContentView } from "./content.view";
import ListContainer from "./list/list.container.vue";
import TableContainer from "./table/table.container.vue";

const store = stearchStore();
const view = provideContentView();
const isTable = computed(
  () => selectViewMode(store.state) === "table" && view.device.value === "wide",
);
</script>

<template>
  <!-- Each view owns its scroll edge: band, rail and scrollbar. -->
  <component :is="isTable ? TableContainer : ListContainer" />
</template>
