<script setup lang="ts">
import { RTextField } from "@/lib";
import RegionHeading from "../region-heading/region-heading.pure-component.vue";
import type { HeaderSearch } from "./header.props";
import { SEARCH_LABEL_ID } from "./header.pure-layout-props";

defineProps<HeaderSearch>();

defineEmits<{ search: [term: string] }>();
</script>

<template>
  <RegionHeading :id="SEARCH_LABEL_ID" tag="span" :text="label" />
  <RTextField
    class="stearch-header-search__field"
    :model-value="term"
    :placeholder="placeholder"
    :aria-label="label"
    @update:model-value="$emit('search', $event)"
  />
  <span aria-live="polite">{{ resultCount }}</span>
</template>

<style scoped>
.stearch-header-search__field {
  flex: 1;
  min-width: 0;
}
</style>
