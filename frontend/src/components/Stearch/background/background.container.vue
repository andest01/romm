<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../Stearch.store";
import BackgroundPure from "./background.pure-component.vue";
import { selectBackgroundProps } from "./background.selectors";

const store = stearchStore();
const props = computed(() => selectBackgroundProps(store.state));
</script>

<template>
  <BackgroundPure v-bind="props" />
</template>
