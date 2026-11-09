<script setup lang="ts">
import { computed } from "vue";
import { RESULTS_HEADING_ID } from "../../Stearch.pure-layout-props";
import { selectAnnouncement } from "../../store/primary-group.selectors";
import stearchStore from "../../store/stearch.store";
import RegionHeading from "./region-heading.pure-component.vue";

// Stub label: move to a locale key before this leaves the fork.
const TITLE = "Games";
const ANNOUNCER_ID = "stearch-announcer";
const store = stearchStore();
const announcement = computed(() => selectAnnouncement(store.state));
</script>

<template>
  <RegionHeading :id="RESULTS_HEADING_ID" tag="h1" :text="TITLE" />
  <div aria-live="polite">
    <RegionHeading :id="ANNOUNCER_ID" tag="span" :text="announcement" />
  </div>
</template>
