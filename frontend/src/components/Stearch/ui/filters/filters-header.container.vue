<script setup lang="ts">
import stearchStore from "../../store/stearch.store";
import BarPure from "./bar/bar.pure-component.vue";
import { SIDEBAR_HEADER_PROPS } from "./filters.selectors";

const store = stearchStore();
</script>

<template>
  <BarPure v-bind="SIDEBAR_HEADER_PROPS" @press="store.dispatch" />
</template>
