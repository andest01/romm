<script setup lang="ts">
import { HEADER_HEADING_ID } from "../../Stearch.pure-layout-props";
import RegionHeading from "../region-heading/region-heading.pure-component.vue";

// Stub label: move to a locale key before this leaves the fork.
const TITLE = "Search";
</script>

<template>
  <RegionHeading :id="HEADER_HEADING_ID" tag="h2" :text="TITLE" />
</template>
