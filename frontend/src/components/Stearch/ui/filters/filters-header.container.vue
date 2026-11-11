<script setup lang="ts">
import stearchStore from "../../store/stearch.store";
import BarPure from "./bar/bar.pure-component.vue";
import { FILTERS_HEADER_PROPS } from "./filters.selectors";

const store = stearchStore();
</script>

<template>
  <BarPure v-bind="FILTERS_HEADER_PROPS" @press="store.dispatch" />
</template>
