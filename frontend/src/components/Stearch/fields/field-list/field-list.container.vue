<script setup lang="ts">
import { computed } from "vue";
import stearchStore from "../../Stearch.store";
import FieldSection from "../field-section/field-section.pure-component.vue";
import { buildRangeActions, selectFieldPreviews } from "../fields.selectors";
import PlatformField from "../platform-field/platform-field.container.vue";

// Stub labels: move to locale keys before this leaves the fork.
const MIN_LABEL = "Min hours";
const MAX_LABEL = "Max hours";

const store = stearchStore();
const fields = computed(() => selectFieldPreviews(store.state));
</script>

<template>
  <template v-for="field in fields" :key="field.id">
    <PlatformField v-if="field.kind === 'platform'" :label="field.label" />
    <FieldSection
      v-else
      :field="field"
      :min-label="MIN_LABEL"
      :max-label="MAX_LABEL"
      @press="store.dispatch"
      @range="(change) => store.dispatch(buildRangeActions(change))"
    />
  </template>
</template>
