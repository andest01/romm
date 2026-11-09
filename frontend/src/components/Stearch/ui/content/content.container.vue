<script setup lang="ts">
import { computed, provide } from "vue";
import { GAME_MENU_EXTRA } from "@/components/GameActions/gameMenuExtra";
import { selectViewMode } from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";
import ActionMenuContainer from "./action-menu/action-menu.container.vue";
import BulkEntry from "./action-menu/bulk-entry.container.vue";
import AttentionDebug from "./attention-debug.container.vue";
import { provideContentView } from "./content.view";
import ListContainer from "./list/list.container.vue";
import TableContainer from "./table/table.container.vue";

provide(GAME_MENU_EXTRA, BulkEntry);
const isDev = import.meta.env.DEV;
const store = stearchStore();
const view = provideContentView();
const isTable = computed(
  () => selectViewMode(store.state) === "table" && view.device.value === "wide",
);
</script>

<template>
  <!-- Each view owns its scroll edge: band, rail and scrollbar. -->
  <component :is="isTable ? TableContainer : ListContainer" />
  <ActionMenuContainer />
  <AttentionDebug v-if="isDev" />
</template>
