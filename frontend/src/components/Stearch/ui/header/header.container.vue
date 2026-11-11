<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../store/stearch.store";
import { useKeyDriver } from "../results/list/use-key-driver";
import HeaderControlsContainer from "./header-controls.container.vue";
import HeaderPillsContainer from "./header-pills.container.vue";
import HeaderSearchContainer from "./header-search.container.vue";
import { createHeaderKeyDriver } from "./header.driver";
import HeaderLayout from "./header.pure-layout.vue";
import { selectHeaderProps } from "./header.selectors";

useKeyDriver(createHeaderKeyDriver());
const store = stearchStore();
const pills = computed(() =>
  selectHeaderProps(store.state).filters.pills.length > 0
    ? HeaderPillsContainer
    : null,
);
</script>

<template>
  <HeaderLayout
    :search="HeaderSearchContainer"
    :controls="HeaderControlsContainer"
    :pills="pills"
  />
</template>
