<script setup lang="ts">
import {
  RESULTS_REGION_ID,
  type StearchLayoutProps,
} from "./Stearch.pure-layout-props";

defineProps<StearchLayoutProps>();
</script>

<template>
  <div
    class="stearch-layout"
    :data-panel="panelLayout.panelState"
    :data-panel-axis="panelLayout.panelAxis"
    :data-panel-position="panelLayout.panelPosition"
  >
    <component :is="skipLink" v-if="skipLink" />
    <div v-if="background" class="stearch-layout__background">
      <component :is="background" />
    </div>
    <header class="stearch-layout__header"><component :is="header" /></header>
    <aside
      class="stearch-layout__panel"
      :inert="panelLayout.panelState === 'hidden'"
    >
      <component :is="panel" />
    </aside>
    <section
      :id="RESULTS_REGION_ID"
      class="stearch-layout__content"
      tabindex="-1"
    >
      <component :is="content" v-if="content" />
    </section>
    <footer v-if="footer" class="stearch-layout__footer">
      <component :is="footer" />
    </footer>
  </div>
</template>

<style scoped>
/* Props become data attributes; everything visual follows from them here.
   Regions are named grid areas; only the panel's transform animates. */
.stearch-layout {
  --stearch-panel-inline-size: 25%;
  --stearch-panel-block-size: 30vh;
  /* The panel's track: empty until shown, so regions keep their names. */
  --stearch-panel-track-inline: 0px;
  --stearch-panel-track-block: 0px;
  position: relative;
  isolation: isolate;
  display: grid;
  overflow: hidden;
  height: calc(100vh - var(--r-nav-h));
  height: calc(100dvh - var(--r-nav-h));
}
.stearch-layout[data-panel="shown"] {
  --stearch-panel-track-inline: var(--stearch-panel-inline-size);
  --stearch-panel-track-block: var(--stearch-panel-block-size);
}

/* One template per edge. Content space changes once, and never animates. */
[data-panel-axis="inline"][data-panel-position="start"] {
  grid-template:
    "panel header" auto
    "panel content" minmax(0, 1fr)
    "panel footer" auto
    / var(--stearch-panel-track-inline) minmax(0, 1fr);
}
[data-panel-axis="inline"][data-panel-position="end"] {
  grid-template:
    "header panel" auto
    "content panel" minmax(0, 1fr)
    "footer panel" auto
    / minmax(0, 1fr) var(--stearch-panel-track-inline);
}
[data-panel-axis="block"][data-panel-position="start"] {
  grid-template:
    "panel" var(--stearch-panel-track-block)
    "header" auto
    "content" minmax(0, 1fr)
    "footer" auto
    / minmax(0, 1fr);
}
[data-panel-axis="block"][data-panel-position="end"] {
  grid-template:
    "header" auto
    "content" minmax(0, 1fr)
    "footer" auto
    "panel" var(--stearch-panel-track-block)
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
.stearch-layout__content,
.stearch-layout__footer {
  isolation: isolate;
}
.stearch-layout__header {
  grid-area: header;
  border-bottom: 1px solid var(--r-color-border);
}
.stearch-layout__content {
  grid-area: content;
  min-height: 0;
}
.stearch-layout__footer {
  grid-area: footer;
  border-top: 1px solid var(--r-color-border);
}

.stearch-layout__panel {
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
[data-panel-axis="inline"] > .stearch-layout__panel {
  inset-block: 0;
  inline-size: var(--stearch-panel-inline-size);
}
[data-panel-axis="block"] > .stearch-layout__panel {
  inset-inline: 0;
  block-size: var(--stearch-panel-block-size);
}
[data-panel-axis="inline"][data-panel-position="start"]
  > .stearch-layout__panel {
  inset-inline-start: 0;
  border-inline-end-width: 1px;
  transform: translateX(-100%);
}
[data-panel-axis="inline"][data-panel-position="end"] > .stearch-layout__panel {
  inset-inline-end: 0;
  border-inline-start-width: 1px;
  transform: translateX(100%);
}
[data-panel-axis="block"][data-panel-position="start"]
  > .stearch-layout__panel {
  inset-block-start: 0;
  border-block-end-width: 1px;
  transform: translateY(-100%);
}
[data-panel-axis="block"][data-panel-position="end"] > .stearch-layout__panel {
  inset-block-end: 0;
  border-block-start-width: 1px;
  transform: translateY(100%);
}

/* Shown: the panel slides over its track. */
.stearch-layout[data-panel="shown"][data-panel-axis] > .stearch-layout__panel {
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}

/* On a phone the panel swoops in over the content instead of beside it. */
html[data-bp~="xs"] .stearch-layout {
  --stearch-panel-inline-size: 100%;
  --stearch-panel-block-size: 100%;
}
html[data-bp~="xs"] .stearch-layout[data-panel] {
  --stearch-panel-track-inline: 0px;
  --stearch-panel-track-block: 0px;
}

@media (prefers-reduced-motion: reduce) {
  .stearch-layout__panel {
    transition: none;
  }
}
</style>
