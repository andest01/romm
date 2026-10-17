<script setup lang="ts">
// GameCardCompact: a landscape gallery card of one constant size (a 2:3 cover
// thumbnail beside the text, as tall as the text block), built to be cheap, and
// a drop-in for GameCard: it takes GameCard's props and declares its emits
// (`GameCardCompactProps` accepts a ROM with only the fields it paints).
//
// Six elements (the link, a title, a one-line info row with a platform icon,
// text and a match mark), the cover as a CSS background on the link's
// ::before. No event handler per card: the grid owns one delegated click
// handler, and hover / focus / cursor / selected are CSS classes. Because the
// size is constant, nothing about the layout is learned from a loaded image.
//
// The info row shows the first region only, so the date always fits.
//
// Honoured: rom, to, focused (the keyboard / controller cursor), selected, webp,
// showPlatformIcon, showTitle, coverSrc, position. Accepted and ignored: hero,
// size, static, decorative, noHover, coverPip, selectable (the grid delegates
// selection). `click` and `ratio` are declared for interface parity and never
// emitted: the grid handles clicks, and the size is constant.
//
// The grid applies `compactCardVars()` once on its root; the card reads them.
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useUISettings } from "@/composables/useUISettings";
import { regionToEmoji } from "@/utils";
import { platformIconUrl } from "@/v2/utils/platformIcons";
import { compactCoverUrl, formatCardDate } from "./compactCard";
import type { GameCardCompactProps, GameCardEmits } from "./gameCardContract";

const props = withDefaults(defineProps<GameCardCompactProps>(), {
  to: undefined,
  size: "md",
  showPlatformIcon: true,
  static: false,
  decorative: false,
  noHover: false,
  showTitle: true,
  coverSrc: undefined,
  coverPip: false,
  selected: undefined,
  selectable: false,
  position: undefined,
});
defineEmits<GameCardEmits>();

const { t, locale } = useI18n();
const { showRegions } = useUISettings();

const title = computed(() => props.rom.name || props.rom.fs_name_no_ext);
const platformName = computed(
  () => props.rom.platform_custom_name || props.rom.platform_display_name,
);
const cover = computed(
  () => props.coverSrc || compactCoverUrl(props.rom, props.webp),
);
const coverStyle = computed(() =>
  cover.value ? { "--cover": `url("${cover.value}")` } : undefined,
);
const platformIcon = computed(() =>
  platformIconUrl(props.rom.platform_slug, props.rom.platform_fs_slug),
);
const meta = computed(() => {
  const flags = showRegions.value
    ? (props.rom.regions ?? [])
        .filter(Boolean)
        .slice(0, 1)
        .map(regionToEmoji)
        .join("")
    : "";
  const date = formatCardDate(props.rom.updated_at, locale.value);
  return [flags, date].filter(Boolean).join(" ");
});
</script>

<template>
  <a
    :id="position === undefined ? undefined : `cc-${position}`"
    class="r-v2-compact-card"
    :class="{
      'is-cursor': focused,
      'is-selected': selected,
      'is-nocover': !cover,
    }"
    :href="to ?? `/rom/${rom.id}`"
    :title="title"
    :tabindex="focused ? 0 : -1"
    :data-pos="position"
    :data-rom-id="rom.id"
    :style="coverStyle"
  >
    <span v-if="showTitle" class="r-v2-compact-card__title">{{ title }}</span>
    <small class="r-v2-compact-card__meta">
      <i
        v-if="showPlatformIcon"
        class="r-v2-compact-card__plat"
        role="img"
        :aria-label="platformName"
        :style="{ backgroundImage: `url(${platformIcon})` }"
      ></i>
      <span class="r-v2-compact-card__text">{{ meta }}</span>
      <b
        class="r-v2-compact-card__match"
        :class="rom.is_identified ? 'is-ok' : 'is-no'"
        :role="rom.is_identified ? undefined : 'img'"
        :aria-label="rom.is_identified ? undefined : t('scan.not-identified')"
        :aria-hidden="rom.is_identified ? 'true' : undefined"
        >{{ rom.is_identified ? "✓" : "?" }}</b
      >
    </small>
  </a>
</template>

<style scoped>
/* A two-column grid: the cover (::before) spans the title and info rows, so its
   height is the text block's height. */
.r-v2-compact-card {
  position: relative;
  display: grid;
  grid-template-columns: var(--r-compact-art-w) minmax(0, 1fr);
  grid-template-rows:
    calc(var(--r-compact-label-lines) * var(--r-compact-label-line))
    var(--r-compact-meta-line);
  column-gap: var(--r-compact-column-gap);
  row-gap: var(--r-compact-text-gap);
  flex: 0 0 auto;
  width: var(--r-compact-w);
  height: var(--r-compact-h);
  border-radius: var(--r-radius-art);
  color: inherit;
  text-decoration: none;
  outline: none;
  transition: background-color var(--r-motion-fast) var(--r-motion-ease-out);
}
.r-v2-compact-card::before {
  content: "";
  grid-column: 1;
  grid-row: 1 / span 2;
  border-radius: calc(var(--r-radius-art) / 2);
  background-color: color-mix(in srgb, var(--r-color-fg) 14%, transparent);
  background-image: var(--cover, none);
  background-size: cover;
  background-position: center;
}
/* A row far from the viewport keeps its text but not its cover; the grid marks
   rows near the viewport `is-near`, which is when the image is requested. */
:global(.r-v2-shell__row:not(.is-near))
  .r-v2-compact-card:not(.is-nocover)::before {
  background-image: none;
}
/* No cover on disk: a quiet hatched box, so an empty card reads as "nothing
   here" and not as still loading. */
.r-v2-compact-card.is-nocover::before {
  background-image: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--r-color-fg) 8%, transparent) 0 5px,
    transparent 5px 10px
  );
  outline: 1px dashed color-mix(in srgb, var(--r-color-fg) 16%, transparent);
  outline-offset: -1px;
}
/* Hover and selection tint the whole card, as a list row does; focus and the
   keyboard / controller cursor draw a ring. */
html:not([data-input="pad"]) .r-v2-compact-card:hover {
  background-color: var(--r-color-bg-elevated);
}
/* Selected reads as the list row's brand tint, with the same deeper tint on hover. */
.r-v2-compact-card.is-selected {
  background-color: color-mix(
    in srgb,
    var(--r-color-brand-primary) 14%,
    transparent
  );
}
html:not([data-input="pad"]) .r-v2-compact-card.is-selected:hover {
  background-color: color-mix(
    in srgb,
    var(--r-color-brand-primary) 22%,
    transparent
  );
}
/* Key and pad focus, and the grid cursor, paint the same inset ring as a focused
   list row; mouse and touch show none. */
html:not([data-input]) .r-v2-compact-card:focus-visible,
html:not([data-input]) .r-v2-compact-card.is-cursor,
html[data-input="key"] .r-v2-compact-card:focus-visible,
html[data-input="key"] .r-v2-compact-card.is-cursor,
html[data-input="pad"] .r-v2-compact-card:focus-visible,
html[data-input="pad"] .r-v2-compact-card.is-cursor {
  box-shadow: inset 0 0 0 var(--r-focus-ring-width) var(--r-color-focus);
}
.r-v2-compact-card__title {
  grid-column: 2;
  grid-row: 1;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--r-compact-label-lines);
  line-clamp: var(--r-compact-label-lines);
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 600;
  line-height: var(--r-compact-label-line);
  color: var(--r-color-fg);
}
.r-v2-compact-card__meta {
  grid-column: 2;
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  overflow: hidden;
  font-size: 11px;
  line-height: var(--r-compact-meta-line);
  font-variant-numeric: tabular-nums;
  color: var(--r-color-fg-secondary);
}
.r-v2-compact-card__plat {
  flex: none;
  width: 12px;
  height: 12px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}
.r-v2-compact-card__text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.r-v2-compact-card__match {
  flex: none;
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
}
.r-v2-compact-card__match.is-ok {
  color: var(--r-color-success);
}
.r-v2-compact-card__match.is-no {
  color: var(--r-color-warning);
}
</style>
