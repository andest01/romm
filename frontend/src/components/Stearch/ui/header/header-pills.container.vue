<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../store/stearch.store";
import HeaderPills from "./header-pills.pure-component.vue";
import { selectHeaderProps } from "./header.selectors";

const store = stearchStore();
const filters = computed(() => selectHeaderProps(store.state).filters);
</script>

<template>
  <HeaderPills
    :pills="filters.pills"
    :clear-label="filters.clearLabel"
    :clear-actions="filters.clearActions"
    @press="store.dispatch"
  />
</template>
