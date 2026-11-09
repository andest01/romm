<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../store/stearch.store";
import HeaderSearch from "./header-search.pure-component.vue";
import { selectHeaderProps } from "./header.selectors";

const store = stearchStore();
const search = computed(() => selectHeaderProps(store.state).search);
</script>

<template>
  <HeaderSearch
    v-bind="search"
    @search="
      (value) =>
        store.dispatch([{ type: 'query/set', patch: { searchTerm: value } }])
    "
  />
</template>
