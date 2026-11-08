<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../store/store";
import HeaderPure from "./header.pure-component.vue";
import { selectHeaderProps } from "./header.selectors";

const store = stearchStore();
const props = computed(() => selectHeaderProps(store.state));
</script>

<template>
  <HeaderPure
    v-bind="props"
    @press="store.dispatch"
    @search="
      (value) =>
        store.dispatch([{ type: 'query/set', patch: { searchTerm: value } }])
    "
  />
</template>
