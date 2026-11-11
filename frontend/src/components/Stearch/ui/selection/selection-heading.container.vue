<script setup lang="ts">
import { SELECTION_HEADING_ID } from "../../Stearch.pure-layout-props";
import RegionHeading from "../region-heading/region-heading.pure-component.vue";

// Stub label: move to a locale key before this leaves the fork.
const TITLE = "Selection";
</script>

<template>
  <RegionHeading :id="SELECTION_HEADING_ID" tag="h2" :text="TITLE" />
</template>
