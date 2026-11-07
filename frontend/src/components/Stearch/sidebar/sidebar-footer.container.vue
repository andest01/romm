<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../Stearch.store";
import BarPure from "./bar/bar.pure-component.vue";
import { selectSidebarFooterProps } from "./sidebar.selectors";

const store = stearchStore();
const props = computed(() => selectSidebarFooterProps(store.state));
</script>

<template>
  <BarPure v-bind="props" @press="store.dispatch" />
</template>
