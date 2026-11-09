<script setup lang="ts">
import { computed, watch } from "vue";
import { focusFromInput } from "@/utils/autofocus";
import { FILTERS_REGION_ID } from "../../Stearch.pure-layout-props";
import { selectIsAdvancedOpen } from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";
import { useKeyDriver } from "../results/list/use-key-driver";
import FieldList from "./fields/field-list/field-list.container.vue";
import SidebarFooter from "./filters-footer.container.vue";
import SidebarHeader from "./filters-header.container.vue";
import { createSidebarKeyDriver } from "./filters.driver";
import SidebarLayout from "./filters.pure-layout.vue";

useKeyDriver(createSidebarKeyDriver());

const store = stearchStore();
const isOpen = computed(() => selectIsAdvancedOpen(store.state));
let opener: HTMLElement | null = null;

// Closing makes the panel inert, which would drop focus to the page.
watch(
  isOpen,
  (open) => {
    const focused = document.activeElement;
    if (open) {
      opener = focused instanceof HTMLElement ? focused : null;
      return;
    }
    const panel = document.getElementById(FILTERS_REGION_ID);
    if (focused !== document.body && !panel?.contains(focused)) return;
    const results = document.querySelector<HTMLElement>(
      '[data-waypoint="results"] [role="grid"]',
    );
    focusFromInput(opener?.isConnected ? opener : results);
  },
  { flush: "post" },
);
</script>

<template>
  <SidebarLayout
    :header="SidebarHeader"
    :body="FieldList"
    :footer="SidebarFooter"
  />
</template>
