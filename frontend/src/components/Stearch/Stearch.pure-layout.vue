<script setup lang="ts">
import {
  FILTERS_HEADING_ID,
  FILTERS_REGION_ID,
  HEADER_HEADING_ID,
  HEADER_REGION_ID,
  RESULTS_HEADING_ID,
  RESULTS_REGION_ID,
  SELECTION_HEADING_ID,
  SELECTION_REGION_ID,
  type StearchLayoutProps,
} from "./Stearch.pure-layout-props";

defineProps<StearchLayoutProps>();
</script>

<template>
  <div
    class="stearch-layout"
    :data-filters="filtersLayout.state"
    :data-filters-axis="filtersLayout.axis"
    :data-filters-position="filtersLayout.position"
  >
    <component :is="skipLink" v-if="skipLink" />
    <div v-if="background" class="stearch-layout__background">
      <component :is="background" />
    </div>
    <section
      :id="HEADER_REGION_ID"
      class="stearch-layout__header"
      :aria-labelledby="HEADER_HEADING_ID"
    >
      <component :is="headerHeading" />
      <component :is="header" />
    </section>
    <aside
      :id="FILTERS_REGION_ID"
      class="stearch-layout__filters"
      :aria-labelledby="FILTERS_HEADING_ID"
      data-waypoint="filters"
      tabindex="-1"
      :inert="filtersLayout.state === 'hidden'"
    >
      <component :is="filters" />
    </aside>
    <section
      :id="RESULTS_REGION_ID"
      class="stearch-layout__results"
      :aria-labelledby="RESULTS_HEADING_ID"
      data-waypoint="results"
      tabindex="-1"
    >
      <component :is="resultsHeading" />
      <component :is="results" v-if="results" />
    </section>
    <section
      v-if="selection"
      :id="SELECTION_REGION_ID"
      class="stearch-layout__selection"
      :aria-labelledby="SELECTION_HEADING_ID"
      data-waypoint="selection"
    >
      <component :is="selectionHeading" />
      <component :is="selection" />
    </section>
  </div>
</template>

<style scoped>
/* Props become data attributes; everything visual follows from them here.
   Regions are named grid areas; only the panel's transform animates. */
.stearch-layout {
  --stearch-filters-inline-size: 25%;
  --stearch-filters-block-size: 30vh;
  /* The panel's track: empty until shown, so regions keep their names. */
  --stearch-filters-track-inline: 0px;
  --stearch-filters-track-block: 0px;
  position: relative;
  isolation: isolate;
  display: grid;
  overflow: hidden;
  height: calc(100vh - var(--r-nav-h));
  height: calc(100dvh - var(--r-nav-h));
}
.stearch-layout[data-filters="shown"] {
  --stearch-filters-track-inline: var(--stearch-filters-inline-size);
  --stearch-filters-track-block: var(--stearch-filters-block-size);
}

/* One template per edge. Content space changes once, and never animates. */
[data-filters-axis="inline"][data-filters-position="start"] {
  grid-template:
    "filters header" auto
    "filters results" minmax(0, 1fr)
    "filters selection" auto
    / var(--stearch-filters-track-inline) minmax(0, 1fr);
}
[data-filters-axis="inline"][data-filters-position="end"] {
  grid-template:
    "header filters" auto
    "results filters" minmax(0, 1fr)
    "selection filters" auto
    / minmax(0, 1fr) var(--stearch-filters-track-inline);
}
[data-filters-axis="block"][data-filters-position="start"] {
  grid-template:
    "filters" var(--stearch-filters-track-block)
    "header" auto
    "results" minmax(0, 1fr)
    "selection" auto
    / minmax(0, 1fr);
}
[data-filters-axis="block"][data-filters-position="end"] {
  grid-template:
    "header" auto
    "results" minmax(0, 1fr)
    "selection" auto
    "filters" var(--stearch-filters-track-block)
    / minmax(0, 1fr);
}
/* The app shell reserves the bottom bar up to this breakpoint, so the layout
   gives that space back or the document scrolls. */
html[data-bp~="sm-and-down"] .stearch-layout {
  height: calc(
    100dvh - var(--r-nav-h) - var(--r-bottom-nav-h) - var(--r-safe-b)
  );
}

.stearch-layout__background {
  position: absolute;
  z-index: -1;
  inset: 0;
  pointer-events: none;
}

/* Each region is its own stacking layer, so whatever a part layers inside it
   (a band, a rail, a raised button) can never rise above the panel. */
.stearch-layout__header,
.stearch-layout__results,
.stearch-layout__selection {
  isolation: isolate;
}
.stearch-layout__header {
  grid-area: header;
  border-bottom: 1px solid var(--r-color-border);
}
.stearch-layout__results {
  grid-area: results;
  min-height: 0;
}
.stearch-layout__selection {
  grid-area: selection;
  border-top: 1px solid var(--r-color-border);
}

.stearch-layout__filters {
  position: absolute;
  z-index: 1;
  overflow: hidden auto;
  border: 0 solid var(--r-color-border);
  background: var(--r-color-bg);
  visibility: hidden;
  /* Stays visible until the slide out finishes. */
  transition:
    transform var(--r-motion-med) var(--r-motion-ease-out),
    visibility 0s linear var(--r-motion-med);
}

/* Which edge: the axis sets the panel's shape, the position its side. */
[data-filters-axis="inline"] > .stearch-layout__filters {
  inset-block: 0;
  inline-size: var(--stearch-filters-inline-size);
}
[data-filters-axis="block"] > .stearch-layout__filters {
  inset-inline: 0;
  block-size: var(--stearch-filters-block-size);
}
[data-filters-axis="inline"][data-filters-position="start"]
  > .stearch-layout__filters {
  inset-inline-start: 0;
  border-inline-end-width: 1px;
  transform: translateX(-100%);
}
[data-filters-axis="inline"][data-filters-position="end"]
  > .stearch-layout__filters {
  inset-inline-end: 0;
  border-inline-start-width: 1px;
  transform: translateX(100%);
}
[data-filters-axis="block"][data-filters-position="start"]
  > .stearch-layout__filters {
  inset-block-start: 0;
  border-block-end-width: 1px;
  transform: translateY(-100%);
}
[data-filters-axis="block"][data-filters-position="end"]
  > .stearch-layout__filters {
  inset-block-end: 0;
  border-block-start-width: 1px;
  transform: translateY(100%);
}

/* Shown: the panel slides over its track. */
.stearch-layout[data-filters="shown"][data-filters-axis]
  > .stearch-layout__filters {
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}

/* On a phone the panel swoops in over the content instead of beside it. */
html[data-bp~="xs"] .stearch-layout {
  --stearch-filters-inline-size: 100%;
  --stearch-filters-block-size: 100%;
}
html[data-bp~="xs"] .stearch-layout[data-filters] {
  --stearch-filters-track-inline: 0px;
  --stearch-filters-track-block: 0px;
}

@media (prefers-reduced-motion: reduce) {
  .stearch-layout__filters {
    transition: none;
  }
}
</style>
