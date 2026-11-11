<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../../store/stearch.store";
import SectionPure from "./section.pure-component.vue";
import { selectSectionProps } from "./section.selectors";

const store = stearchStore();
const props = computed(() => selectSectionProps(store.state));
</script>

<template>
  <SectionPure v-if="props" v-bind="props" @press="store.dispatch" />
</template>
