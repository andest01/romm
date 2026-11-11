<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../store/stearch.store";
import BarPure from "./bar/bar.pure-component.vue";
import { selectFiltersFooterProps } from "./filters.selectors";

const store = stearchStore();
const props = computed(() => selectFiltersFooterProps(store.state));
</script>

<template>
  <BarPure v-bind="props" @press="store.dispatch" />
</template>
