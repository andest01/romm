<script setup lang="ts">
import { computed } from "vue";
import { useBreakpoint } from "@/composables/useBreakpoint";
import { selectViewMode } from "../Stearch.selectors";
import stearchStore from "../Stearch.store";
import ContentLayout from "./content.layout.vue";
import ListContainer from "./list/list.container.vue";
import { headHeightFor } from "./list/list.selectors";
import RailContainer from "./rail/rail.container.vue";
import SectionContainer from "./section/section.container.vue";
import {
  selectBandOffset,
  selectSectionProps,
} from "./section/section.selectors";
import TableContainer from "./table/table.container.vue";
import { TABLE_ROW_HEIGHT } from "./table/table.selectors";

const { xs } = useBreakpoint();
const store = stearchStore();
const isTable = computed(
  () => selectViewMode(store.state) === "table" && !xs.value,
);
const band = computed(() =>
  selectSectionProps(store.state) ? SectionContainer : null,
);
</script>

<template>
  <ContentLayout
    :items="isTable ? TableContainer : ListContainer"
    :band="band"
    :rail="RailContainer"
    :band-height="headHeightFor(xs)"
    :band-inset="isTable ? TABLE_ROW_HEIGHT : 0"
    :band-offset="selectBandOffset(store.state)"
  />
</template>
