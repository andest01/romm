<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../store/stearch.store";
import HeaderControls from "./header-controls.pure-component.vue";
import { selectHeaderProps } from "./header.selectors";
import SavedSearchesContainer from "./saved-searches.container.vue";

// Stub label: move to a locale key before this leaves the fork.
const GROUP_LABEL = "Results options";
const store = stearchStore();
const header = computed(() => selectHeaderProps(store.state));
</script>

<template>
  <HeaderControls
    :group-label="GROUP_LABEL"
    :saved-searches="SavedSearchesContainer"
    :filters="header.filters"
    :advanced="header.advanced"
    :sort="header.sort"
    :view="header.view"
    @press="store.dispatch"
  />
</template>
