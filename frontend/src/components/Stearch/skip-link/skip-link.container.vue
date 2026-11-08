<script setup lang="ts">
import { RESULTS_REGION_ID } from "../Stearch.pure-layout-props";
import SkipLinkPure from "./skip-link.pure-component.vue";

// Stub label: move to a locale key before this leaves the fork.
const LABEL = "Skip to results";
</script>

<template>
  <SkipLinkPure :label="LABEL" :target="RESULTS_REGION_ID" />
</template>
