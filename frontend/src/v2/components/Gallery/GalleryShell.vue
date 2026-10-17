<script setup lang="ts">
// GalleryShell: shared layout for Platform / Search / Collection.
//
// Three structural sections, top to bottom, all sharing one scrollbar:
//   1. HEADER: view-supplied via `#header` slot. Whatever the view
//                wants there: an InfoPanel with platform / collection
//                metadata, a plain PageHeader for Search, etc.
//   2. TOOLBAR: search input + group/layout/dock controls. Sticky right
//                below the top bar; once pinned it shares one glass surface
//                with the top bar, so cards blur behind both.
//   3. GRID / TABLE: the row-virtualised content (cards in grid mode,
//                div-based rows in list mode, same shell scroller, same
//                AlphaStrip wiring; the list column header lives in the
//                prepend, sticky below the toolbar).
//
// Cross-view behaviour owned by the shell: the virtualizer, sticky
// glass toolbar + sticky list column header, AlphaStrip,
// grid per-row dwell-debounced prefetch, scroll restoration,
// search-input debounce, URL filter sync. Each view supplies its
// header and its own resource-load flow. List rows own their per-row
// fetch lifecycle internally (mount = entered overscan window).
import {
  RDivider,
  REmptyState,
  RLetterHeading,
  RVirtualScroller,
} from "@v2/lib";
import {
  useDebounceFn,
  useEventListener,
  useIntersectionObserver,
  useResizeObserver,
} from "@vueuse/core";
import { storeToRefs } from "pinia";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";
import { useUISettings } from "@/composables/useUISettings";
import storeGalleryFilter from "@/stores/galleryFilter";
import AlphaJumpMenu from "@/v2/components/Gallery/AlphaJumpMenu.vue";
import AlphaStrip from "@/v2/components/Gallery/AlphaStrip.vue";
import BackToTopButton from "@/v2/components/Gallery/BackToTopButton.vue";
import FilterDrawer from "@/v2/components/Gallery/FilterDrawer.vue";
import GalleryToolbar from "@/v2/components/Gallery/GalleryToolbar.vue";
import GameListHeader from "@/v2/components/Gallery/GameListHeader.vue";
import GameListRow from "@/v2/components/Gallery/GameListRow.vue";
import GameListSkeletonRow from "@/v2/components/Gallery/GameListSkeletonRow.vue";
import SelectionBar from "@/v2/components/Gallery/SelectionBar.vue";
import {
  getListColumns,
  getListMinWidth,
  getSortOptions,
  isListSortKey,
  LIST_HEADER_HEIGHT_PX,
  LIST_ROW_PAD_X_PX,
  type ListSortKey,
} from "@/v2/components/Gallery/listColumns";
import { GameCard, GameCardSkeleton } from "@/v2/components/GameCard";
import GameCardCompact from "@/v2/components/GameCard/GameCardCompact.vue";
import {
  COMPACT_CARD_H_PX,
  COMPACT_CARD_W_PX,
  COMPACT_GAP_PX,
  COMPACT_ROW_GAP_PX,
  COMPACT_ROW_H_PX,
  compactCoverUrl,
  compactCardVars,
} from "@/v2/components/GameCard/compactCard";
import { useBackgroundArt } from "@/v2/composables/useBackgroundArt";
import { useBreakpoint } from "@/v2/composables/useBreakpoint";
import { coverRatio, isBoxartStyle } from "@/v2/composables/useCoverArt";
import { useCoverBuffer } from "@/v2/composables/useCoverBuffer";
import { useCssLength } from "@/v2/composables/useCssLength";
import { useDebouncedSearch } from "@/v2/composables/useDebouncedSearch";
import { useDebugMode } from "@/v2/composables/useDebugMode";
import { useGalleryCoverRatios } from "@/v2/composables/useGalleryCoverRatios";
import { useGalleryFilterUrl } from "@/v2/composables/useGalleryFilterUrl";
import { useGalleryMode } from "@/v2/composables/useGalleryMode";
import { useGalleryOrderUrl } from "@/v2/composables/useGalleryOrderUrl";
import { useGallerySelectAll } from "@/v2/composables/useGallerySelectAll";
import { useGallerySelectionInput } from "@/v2/composables/useGallerySelectionInput";
import { useGalleryViewModeUrl } from "@/v2/composables/useGalleryViewModeUrl";
import {
  ROW_CHROME_PX,
  useGalleryVirtualItems,
  type GalleryItem,
} from "@/v2/composables/useGalleryVirtualItems";
import { claimStickY } from "@/v2/composables/useGamepad";
import { useGridCruise } from "@/v2/composables/useGridCruise";
import { useGridNav } from "@/v2/composables/useGridNav";
import { useListExpansion } from "@/v2/composables/useListExpansion";
import { usePinnedToolbar } from "@/v2/composables/usePinnedToolbar";
import { useResponsiveColumns } from "@/v2/composables/useResponsiveColumns";
import { useStickScroll } from "@/v2/composables/useStickScroll";
import { useVirtualScrollDebug } from "@/v2/composables/useVirtualScrollDebug";
import { toWebpUrl, useWebpSupport } from "@/v2/composables/useWebpSupport";
import storeGalleryRoms, {
  DEFAULT_ORDER_BY,
  type GalleryOrderKey,
  orderSupportsLetters,
} from "@/v2/stores/galleryRoms";
import storeGallerySelection from "@/v2/stores/gallerySelection";
import storeScrollRestoration from "@/v2/stores/scrollRestoration";
import { isEditable } from "@/v2/utils/editable";
import {
  centerX,
  moveCursor,
  nearestInRow,
  rowOfIndex,
  type CursorKey,
  type CursorRow,
} from "@/v2/utils/gridCursor";

interface Props {
  /** Whether the header slot has content to render. False suppresses
   * the header (the prepend band collapses; toolbar pins immediately). */
  hasHeader: boolean;
  /** Toolbar's search-input placeholder. */
  searchPlaceholder: string;
  /** Focus the toolbar's search field on mount. */
  autofocusSearch?: boolean;
  /** Empty-state message shown when the gallery resolves with zero items. */
  emptyMessage: string;
  /** Empty-state icon, shared with not-found mode. */
  emptyIcon?: string;
  /** "Not found" mode: replaces all body items with a single empty row. */
  notFound?: boolean;
  /** Override the empty-state message in not-found mode. */
  notFoundMessage?: string | undefined;
  /** Whether GameCards should display the platform badge corner (Search /
   * Collection: yes; Platform: no, since the cards already share a platform). */
  showPlatformBadge?: boolean;
  /** Skeleton row count painted while the very first window is loading. */
  skeletonRowCount?: number;
  /** Surface the platforms multi-select inside the filter drawer.
   *  False for single-platform views (Platform.vue) where the platform
   *  context is fixed; true for cross-platform views (Collection, Search). */
  showPlatformsInFilter?: boolean;
  /** Include the `platform` column in list mode. False on Platform.vue
   * (every row shares the same platform); true on cross-platform views
   * (Search, Collection, Missing games) where the column carries info. */
  showPlatformColumn?: boolean;
  /** Sort applied while the URL names none. `null` orders by search
   * relevance (Search). */
  defaultOrderBy?: GalleryOrderKey | null;
}

const props = withDefaults(defineProps<Props>(), {
  autofocusSearch: false,
  emptyIcon: "mdi-gamepad-variant-outline",
  notFound: false,
  notFoundMessage: undefined,
  showPlatformBadge: true,
  skeletonRowCount: 4,
  showPlatformsInFilter: true,
  showPlatformColumn: true,
  defaultOrderBy: DEFAULT_ORDER_BY,
});

defineSlots<{
  /** View-specific header (InfoPanel / PageHeader / etc). Rendered in
   * the scroller's `#prepend` slot, so it scrolls naturally with the rest
   * of the content. Must NOT carry a divider of its own; the shell
   * paints the single divider at the bottom of the prepend band. */
  header(): unknown;
}>();

useGalleryFilterUrl();
useGalleryOrderUrl(props.defaultOrderBy);
useGalleryViewModeUrl();

const { t } = useI18n();
const route = useRoute();
const galleryRoms = storeGalleryRoms();
const galleryFilterStore = storeGalleryFilter();
const gallerySelection = storeGallerySelection();
const selectionInput = useGallerySelectionInput();
const scrollRestoration = storeScrollRestoration();
const {
  searchTerm,
  filterMatched,
  filterFavorites,
  filterDuplicates,
  filterPlayables,
  filterMissing,
  filterPhysical,
  filterVerified,
  filterRA,
  filterSaves,
  filterStates,
  filterSoundtrack,
  selectedPlatforms,
  selectedGenres,
  selectedFranchises,
  selectedCollections,
  selectedCompanies,
  selectedPublishers,
  selectedDevelopers,
  selectedAgeRatings,
  selectedRegions,
  selectedLanguages,
  selectedPlayerCounts,
  selectedMetadataProviders,
  selectedTags,
  selectedStatuses,
  genresLogic,
  franchisesLogic,
  collectionsLogic,
  companiesLogic,
  publishersLogic,
  developersLogic,
  ageRatingsLogic,
  regionsLogic,
  languagesLogic,
  playerCountsLogic,
  metadataProvidersLogic,
  tagsLogic,
  statusesLogic,
  selectedLengthMinHours,
  selectedLengthMaxHours,
} = storeToRefs(galleryFilterStore);

// Drawer open state, bound to FilterDrawer via v-model.
const filterDrawerOpen = ref(false);

// Active filter count: drives the toolbar badge. Counts each
// boolean/tri-state filter that's set, plus each multi-select group
// with at least one selection. Mirrors `FilterDrawer`'s own count so
// the badge agrees with the drawer header.
const filterActiveCount = computed(() => {
  let n = 0;
  if (filterMatched.value !== null) n += 1;
  if (filterFavorites.value !== null) n += 1;
  if (filterDuplicates.value !== null) n += 1;
  if (filterPlayables.value !== null) n += 1;
  if (filterMissing.value !== null) n += 1;
  if (filterPhysical.value !== null) n += 1;
  if (filterVerified.value !== null) n += 1;
  if (filterRA.value !== null) n += 1;
  if (filterSaves.value !== null) n += 1;
  if (filterStates.value !== null) n += 1;
  if (filterSoundtrack.value !== null) n += 1;
  if (selectedPlatforms.value.length > 0) n += 1;
  for (const arr of [
    selectedGenres,
    selectedFranchises,
    selectedCollections,
    selectedCompanies,
    selectedPublishers,
    selectedDevelopers,
    selectedAgeRatings,
    selectedRegions,
    selectedLanguages,
    selectedPlayerCounts,
    selectedMetadataProviders,
    selectedTags,
    selectedStatuses,
  ]) {
    if (arr.value.length > 0) n += 1;
  }
  if (
    selectedLengthMinHours.value !== null ||
    selectedLengthMaxHours.value !== null
  ) {
    n += 1;
  }
  return n;
});

// The initial URL hydration in `useGalleryFilterUrl` runs before this watch
// is set up, so it does not echo here.
watch(
  [
    searchTerm,
    filterMatched,
    filterFavorites,
    filterDuplicates,
    filterPlayables,
    filterMissing,
    filterPhysical,
    filterVerified,
    filterRA,
    filterSaves,
    filterStates,
    filterSoundtrack,
    selectedPlatforms,
    selectedGenres,
    selectedFranchises,
    selectedCollections,
    selectedCompanies,
    selectedPublishers,
    selectedDevelopers,
    selectedAgeRatings,
    selectedRegions,
    selectedLanguages,
    selectedPlayerCounts,
    selectedMetadataProviders,
    selectedTags,
    selectedStatuses,
    genresLogic,
    franchisesLogic,
    collectionsLogic,
    companiesLogic,
    publishersLogic,
    developersLogic,
    ageRatingsLogic,
    regionsLogic,
    languagesLogic,
    playerCountsLogic,
    metadataProvidersLogic,
    tagsLogic,
    statusesLogic,
    selectedLengthMinHours,
    selectedLengthMaxHours,
  ],
  () => {
    galleryRoms.invalidateWindows();
    void galleryRoms.fetchInitialMetadata();
  },
  { deep: true },
);

const { supportsWebp } = useWebpSupport();

const { total, reorderTotal, charIndex, initialFetching, orderBy, orderDir } =
  storeToRefs(galleryRoms);

const { groupBy, layout, toolbarPosition } = useGalleryMode();

// Rows pack into the scroller's content box, already inside its gutters, strip
// column and scrollbar. Card width tracks the breakpoint:
//   card   = matches the `--r-card-art-w` the shell sets per breakpoint
//            (108 on xs, 158 otherwise) so the JS row-chunking and the
//            CSS grid `minmax(--r-card-art-w, 1fr)` stay in lock-step.
const { xs, smAndDown } = useBreakpoint();
const sectionEl = ref<HTMLElement | null>(null);
const navHeight = useCssLength("var(--r-nav-h)");
const scrollerRef = ref<InstanceType<typeof RVirtualScroller> | null>(null);
const scrollerEl = computed(() => scrollerRef.value?.containerEl ?? null);
// A jump to "M" means nothing unless the gallery is in letter order.
const lettersSupported = computed(() => {
  const key = galleryRoms.effectiveOrderBy;
  return key !== null && orderSupportsLetters(key);
});
const stripVisible = computed(() => !smAndDown.value && lettersSupported.value);
const jumpMenuVisible = computed(
  () => smAndDown.value && lettersSupported.value,
);
// The scroller's classic scrollbar gutter (0 for overlay scrollbars), which
// the rows and the strip both have to clear.
const scrollbarWidth = ref(0);
// Card-art width reference (matches GameCard's `--r-card-art-w`); sets the
// fixed card HEIGHT (a 2/3 cover at this width). Real width follows the ratio.
const CARD_GAP_PX = 12;
// The compact landscape card (search) has one constant size, so nothing about
// the layout waits on an image.
const compact = computed(() => galleryRoms.compactCards);
const compactRowStyle = {
  ...compactCardVars(),
  paddingBottom: `${COMPACT_ROW_GAP_PX}px`,
};
const router = useRouter();
// The compact cards are plain links with no handler of their own; this one
// handler routes a click on any of them. Modified clicks fall through to the
// browser (new tab, new window).
// The page backdrop takes the cover of the card under the pointer or the cursor,
// as the table rows do. It holds still while cruising or flying and settles on
// the cursor's card when the scroll stops.
const setBgArt = useBackgroundArt();
function showBackdrop(position: number | null | undefined) {
  if (cruising.value || flying.value || position == null) return;
  const rom = getRomAt(position);
  if (!rom) return;
  // The backdrop is blurred, so the small cover (already loaded by the card) is enough.
  const path = rom.path_cover_small || rom.path_cover_large || null;
  const url = path ? toWebpUrl(path, supportsWebp.value) : rom.url_cover;
  if (url) setBgArt(url);
}
function onCompactPointerOver(e: PointerEvent) {
  if (!compact.value) return;
  const card = (e.target as Element | null)?.closest<HTMLElement>(
    "a.r-v2-compact-card",
  );
  if (card?.dataset.pos) showBackdrop(Number(card.dataset.pos));
}
function onCompactClick(e: MouseEvent) {
  if (!compact.value || e.defaultPrevented || e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const card = (e.target as Element | null)?.closest<HTMLElement>(
    "a.r-v2-compact-card",
  );
  if (!card?.dataset.romId) return;
  e.preventDefault();
  void router.push(`/rom/${card.dataset.romId}`);
}
const cardWidth = () =>
  compact.value ? COMPACT_CARD_W_PX : xs.value ? 130 : 158;
const cardHeight = () =>
  compact.value ? COMPACT_CARD_H_PX : Math.round(cardWidth() / (2 / 3));
const { columns, usableWidth } = useResponsiveColumns(scrollerEl, {
  cardWidth,
  gap: CARD_GAP_PX,
});

// Fallback cover ratio (boxart style); the per-card `--r-cover-ratio` seed
// before GameCover measures the real image, plus the bootstrap skeletons.
// The flow-packer takes it too (`fallbackRatio`): a card with no artwork
// paints its placeholder at this ratio and never reports a measured one, so
// packing it as box art would under-reserve its width and overflow the row.
const { boxartStyle } = useUISettings();
const coverAspectRatio = computed(() =>
  coverRatio(
    isBoxartStyle(boxartStyle.value) ? boxartStyle.value : "cover_path",
  ),
);

// Measured natural cover ratios feeding the flow-packer; GameCard reports
// each cover's ratio on load (`onCardRatio`), the packer reads `ratioAt`,
// and `ratioVersion` bumps (debounced) to trigger a single re-pack.
const { ratioVersion, ratioAt, onCardRatio } = useGalleryCoverRatios();

// The list row's natural min-width (all fixed tracks + the title floor). Fed
// to the virtual scroller as `minContentWidth` in list mode so a viewport
// narrower than the columns scrolls the list HORIZONTALLY instead of clipping
// them. Also drives the sticky column header's width so it scrolls in step.
// Less the rows' leading padding, which sits in the gutter they bleed into.
const listMinWidth = computed(
  () => getListMinWidth(props.showPlatformColumn) - LIST_ROW_PAD_X_PX,
);

// Compact list rows (phones / tablets) open one detail panel at a time; the
// virtualiser reads the same position to give that row its taller slot.
const listExpansion = useListExpansion();
watch(
  [
    layout,
    smAndDown,
    () => galleryRoms.total,
    () => galleryRoms.orderBy,
    () => galleryRoms.orderDir,
  ],
  listExpansion.collapse,
);

// 2D arrow / gamepad nav for both layouts of the gallery. Two passes:
//   * Grid mode: rows are `.r-v2-shell__row` (the per-virtualizer-item
//     wrapper around the row's GameCards). ArrowLeft/Right within a row,
//     ArrowUp/Down jumps to the same column in the next row.
//   * List mode: each `.game-list-row` is both row and cell. ArrowLeft/
//     Right is no-op (single cell per row); ArrowUp/Down moves between
//     rows.
// Both call sites resolve `current()` against the same focused element
// and only the matching one actually moves focus, so they don't fight.
// Virtualised rows past the overscan window simply aren't in the DOM, so
// nav clamps at the boundary; scrolling past mounts more rows.
function revealEdge(edge: "first" | "last") {
  scrollToItem(edge === "first" ? 0 : virtualItems.value.length - 1, false);
}
useGridNav(sectionEl, {
  rowSelector: ".r-v2-shell__row",
  roving: true,
  revealEdge,
  // The compact grid has its own cursor and tab stop.
  disabled: () => compact.value,
});
useGridNav(sectionEl, {
  rowSelector: ".game-list-row",
  getCells: (row) => [row],
  roving: true,
  revealEdge,
  disabled: () => layout.value !== "list",
});

const loadingInitial = computed(
  () => initialFetching.value && total.value === 0,
);

const notFoundRef = computed(() => props.notFound);
// An empty result under a search or filters says why, not that the view is empty.
const emptyMessageRef = computed(() => {
  if (searchTerm.value) {
    return t("rom.no-games-match-query", { query: searchTerm.value });
  }
  if (filterActiveCount.value > 0) return t("rom.no-games-match-filters");
  return props.emptyMessage;
});
const notFoundMessageRef = computed(
  () => props.notFoundMessage ?? props.emptyMessage,
);

const { virtualItems, letterToIndex, availableLetters, getItemHeight } =
  useGalleryVirtualItems({
    layout,
    groupBy,
    total,
    charIndex,
    columns,
    loadingInitial,
    emptyMessage: emptyMessageRef,
    notFound: notFoundRef,
    notFoundMessage: notFoundMessageRef,
    skeletonRowCount: props.skeletonRowCount,
    skeletonTotal: reorderTotal,
    cardHeight,
    rowWidth: usableWidth,
    gap: CARD_GAP_PX,
    // Compact cards never measure: every position packs at the card's own shape.
    ratioAt: (position: number) => (compact.value ? 0 : ratioAt(position)),
    ratioVersion,
    listSettledDetail: listExpansion.settledPanelHeight,
    fallbackRatio: () =>
      compact.value
        ? COMPACT_CARD_W_PX / COMPACT_CARD_H_PX
        : coverAspectRatio.value,
    rowChromePx: () => (compact.value ? COMPACT_ROW_GAP_PX : ROW_CHROME_PX),
  });

useResizeObserver(scrollerEl, () => {
  const el = scrollerEl.value;
  if (el) scrollbarWidth.value = el.offsetWidth - el.clientWidth;
});
// Published on <html> so the fixed top bar can stop short of the scrollbar,
// which it would otherwise cover.
const SCROLLBAR_W_VAR = "--r-v2-shell-scrollbar-w";
watch(scrollbarWidth, (w) => {
  document.documentElement.style.setProperty(SCROLLBAR_W_VAR, `${w}px`);
});
onBeforeUnmount(() => {
  document.documentElement.style.removeProperty(SCROLLBAR_W_VAR);
});

// Where the open row sits in the packed list. Recomputed when a row opens or
// the list re-packs, never on the animation's frames.
const expandedIndex = computed(() => {
  const position = listExpansion.expandedPosition.value;
  if (position == null) return -1;
  return virtualItems.value.findIndex(
    (item) => item.kind === "list-row" && item.position === position,
  );
});
const listOffsetShift = computed(() =>
  expandedIndex.value < 0
    ? undefined
    : { fromIndex: expandedIndex.value, px: listExpansion.shiftPx.value },
);

// ── Toolbar ─────────────────────────────────────────────────────────
const scrollTopNow = computed(() => scrollerRef.value?.scrollTop ?? 0);
const { toolbarHeight, pinDistance, pinned, bindToolbar, bindSentinel } =
  usePinnedToolbar(scrollTopNow);
// The floating dock leaves no toolbar to pin, so a sentinel above the column
// header marks when that header reaches the top bar.
const listHeaderSentinel = ref<HTMLElement | null>(null);
const listHeaderAtTop = ref(false);
useIntersectionObserver(
  listHeaderSentinel,
  ([entry]) => {
    listHeaderAtTop.value =
      !!entry?.rootBounds &&
      !entry.isIntersecting &&
      entry.boundingClientRect.top < entry.rootBounds.top;
  },
  {
    root: computed(() => scrollerRef.value?.containerEl ?? null),
    rootMargin: () => `-${navHeight.value}px 0px 0px 0px`,
  },
);
const listHeaderPinned = computed(() =>
  toolbarPosition.value === "floating" ? listHeaderAtTop.value : pinned.value,
);
// The AlphaStrip follows the toolbar down until it pins: a scroll-driven
// animation (hence `timeline-scope`), else a style write on the strip alone.
const supportsScrollTimeline =
  typeof CSS !== "undefined" &&
  CSS.supports("animation-timeline: scroll()") &&
  CSS.supports("timeline-scope: --a");
const stripRef = ref<InstanceType<typeof AlphaStrip> | null>(null);
if (!supportsScrollTimeline) {
  const stripShift = computed(() =>
    Math.max(0, pinDistance.value - scrollTopNow.value),
  );
  watchEffect(() => {
    (stripRef.value?.$el as HTMLElement | undefined)?.style.setProperty(
      "--r-v2-shell-strip-shift",
      `${stripShift.value}px`,
    );
  });
}

// ── Viewport range / AlphaStrip / dwell prefetch ────────────────────
const viewportRange = ref<{ first: number; last: number }>({
  first: 0,
  last: -1,
});
function onViewportRangeChange(range: { first: number; last: number }) {
  viewportRange.value = range;
  bufferUpdate(range);
  void scheduleFetchSync(range);
}

// Rows kept rendered beyond the viewport. Adaptive so the rendered CARD count
// stays bounded regardless of how many columns fit: a fixed row overscan on a
// wide screen (~9 cards/row) mounts hundreds of off-screen cards, and each
// card is an expensive subtree (cover + hover overlay + shared game actions).
// We target a roughly constant overscan-card budget per side, clamped so a
// single-column phone keeps enough rows for smooth scrolling without
// overshooting. List rows are one item each → a flat row count is fine.
const GRID_OVERSCAN_CARDS = 60;
// Compact rows are 60px, so a generous overscan keeps text mounted far from the
// viewport; only the covers wait for the near-observer below.
const COMPACT_OVERSCAN_ROWS = 60;
const virtualOverscan = computed(() =>
  layout.value === "list"
    ? 12
    : compact.value
      ? COMPACT_OVERSCAN_ROWS
      : Math.min(
          20,
          Math.max(
            4,
            Math.round(GRID_OVERSCAN_CARDS / Math.max(1, columns.value)),
          ),
        ),
);

// ── Debug overlay bridge ────────────────────────────────────────────
// Publish the virtual scroller's window stats so the global DebugOverlay
// can show whether windowing is actually trimming the DOM as you scroll.
// Gated on `debugMode`: when off the effect early-returns before reading
// any scroll state, so it never re-runs on scroll (zero runtime cost).
const { enabled: debugMode } = useDebugMode();
const virtualDebug = useVirtualScrollDebug();

watchEffect(() => {
  if (!debugMode.value) {
    virtualDebug.clear();
    return;
  }
  const items = virtualItems.value;
  const total = items.length;
  const vr = viewportRange.value;
  const empty = total === 0 || vr.last < vr.first;
  const overscan = virtualOverscan.value;
  const first = empty ? 0 : Math.max(0, vr.first - overscan);
  const last = empty ? -1 : Math.min(total - 1, vr.last + overscan);
  // Count the cards actually mounted in the rendered window; grid rows fan
  // out into many cards, so this is the real DOM weight (not just row count).
  let renderedCards = 0;
  for (let i = first; i <= last; i++) {
    const it = items[i];
    if (!it) continue;
    if (it.kind === "row") renderedCards += it.endPosition - it.startPosition;
    else if (it.kind === "skeleton-row") renderedCards += it.cards;
    else renderedCards += 1;
  }
  virtualDebug.publish({
    label: layout.value === "list" ? "gallery·list" : "gallery·grid",
    total,
    renderedRows: empty ? 0 : last - first + 1,
    renderedCards,
    viewportFirst: vr.first,
    viewportLast: vr.last,
    overscan,
    scrollTop: scrollerRef.value?.scrollTop ?? 0,
  });
});

const visibleLettersSet = computed<Set<string>>(() => {
  const set = new Set<string>();
  const r = viewportRange.value;
  if (r.last < r.first) return set;
  const items = virtualItems.value;
  for (let i = r.first; i <= r.last; i++) {
    const it = items[i];
    if (!it) continue;
    if (it.kind === "letter-header") set.add(it.letter);
    else if (it.kind === "row") for (const l of it.letters) set.add(l);
    else if (it.kind === "list-row") set.add(it.letter);
  }
  return set;
});

const currentLetter = computed<string>(() => {
  const r = viewportRange.value;
  if (r.last < r.first) return "";
  const items = virtualItems.value;
  for (let i = r.first; i <= r.last; i++) {
    const it = items[i];
    if (!it) continue;
    if (it.kind === "letter-header") return it.letter;
    if (it.kind === "row" && it.letters.length > 0) return it.letters[0]!;
    if (it.kind === "list-row") return it.letter;
  }
  return "";
});

// Viewport-driven windowed fetch. The shell collects which positions are
// currently visible (from the rows in `viewportRange`, for both grid and
// list layouts) and hands them to the store's `syncVisibleWindows`, which
// aligns each to its shared 72-item window, dedupes, starts the windows
// covering the viewport, and cancels any that scrolled out of view.
// Batching visible cards into a handful of paginated `getRoms` requests
// (instead of one request per card) is what keeps a fast scroll, or two
// users scrolling at once, from flooding the single-worker backend.
//
// A small debounce on viewport changes prevents fire-and-cancel storms
// during smooth scrolling; only when the viewport settles for
// `FETCH_DEBOUNCE_MS` do we sync. Both layouts share this one path, so the
// list is debounced too (list rows no longer self-fetch on mount).
const FETCH_DEBOUNCE_MS = 80;

function collectVisiblePositions(range: {
  first: number;
  last: number;
}): Set<number> {
  const out = new Set<number>();
  if (range.last < range.first) return out;
  const items = virtualItems.value;
  for (let i = range.first; i <= range.last; i++) {
    const it = items[i];
    if (!it) continue;
    // Grid rows fan out into a contiguous run of card positions; list rows
    // carry a single position each.
    if (it.kind === "row") {
      for (let p = it.startPosition; p < it.endPosition; p++) out.add(p);
    } else if (it.kind === "list-row") {
      out.add(it.position);
    }
  }
  return out;
}

// Compact text comes from the fetched windows, so fetch far past the viewport
// (more ahead than behind) and a fast scroll lands on rows that already have text.
const COMPACT_FETCH_BEHIND_ROWS = 100;
const COMPACT_FETCH_AHEAD_ROWS = 300;
function syncFetches(range: { first: number; last: number }) {
  const widened = compact.value
    ? {
        first: Math.max(0, range.first - COMPACT_FETCH_BEHIND_ROWS),
        last: Math.min(
          virtualItems.value.length - 1,
          range.last + COMPACT_FETCH_AHEAD_ROWS,
        ),
      }
    : range;
  galleryRoms.syncVisibleWindows(collectVisiblePositions(widened));
}

// Covers paint only in rows near the viewport: one observer over the rows (not
// every card) marks them `is-near`, and the card's CSS holds the cover back
// until then. Text is never held back.
const NEAR_MARGIN_PX = 600;
let nearObserver: IntersectionObserver | null = null;
function nearRows(): IntersectionObserver {
  nearObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle("is-near", entry.isIntersecting);
      }
    },
    { root: scrollerEl.value ?? null, rootMargin: `${NEAR_MARGIN_PX}px 0px` },
  );
  return nearObserver;
}
const vNear = {
  mounted: (el: HTMLElement) => {
    nearRows().observe(el);
    paintCursorIn(el);
  },
  // A row that re-renders (a window arrives, a class is reset) gets the cursor back.
  updated: (el: HTMLElement) => paintCursorIn(el),
  unmounted: (el: HTMLElement) => nearObserver?.unobserve(el),
};
onBeforeUnmount(() => nearObserver?.disconnect());

// Cover look-ahead: warms the browser cache with the covers just ahead of the
// scroll (a lead sized by speed, topped up before it runs out), and drops
// everything while the scroll flies. The cards still paint their own covers
// once their row is near; a flying grid hides them and runs on text alone.
const flying = ref(false);

// One-time entrance for the compact grid: plays when the grid first has results
// and when the layout switches to it, never on scroll. Only rows mounted inside
// the viewport animate (all of them, so no seam shows on screen), with the
// stagger delay capped; the class comes off once it has played, so a recycled row
// never replays it.
const ENTRANCE_MAX_DELAY_ROWS = 14;
const ENTRANCE_STEP_MS = 19;
const ENTRANCE_MS = 176;
const entering = ref(false);
let entranceBase = 0;
let entranceEnd = 0;
let entranceTimer: ReturnType<typeof setTimeout> | undefined;
function playEntrance() {
  clearTimeout(entranceTimer);
  entranceBase = viewportRange.value.first;
  entranceEnd = viewportRange.value.last + 1;
  entering.value = true;
  entranceTimer = setTimeout(
    () => {
      entering.value = false;
    },
    ENTRANCE_MS + ENTRANCE_MAX_DELAY_ROWS * ENTRANCE_STEP_MS + 100,
  );
}
watch(
  () => [compact.value, layout.value, galleryRoms.total > 0] as const,
  ([isCompact, mode, hasRows]) => {
    if (isCompact && mode === "grid" && hasRows) playEntrance();
  },
  { flush: "post", immediate: true },
);
onBeforeUnmount(() => clearTimeout(entranceTimer));
function entranceStyle(index: number) {
  if (!entering.value) return compactRowStyle;
  if (index < entranceBase || index > entranceEnd) return compactRowStyle;
  const i = Math.min(index - entranceBase, ENTRANCE_MAX_DELAY_ROWS);
  return { ...compactRowStyle, "--enter-i": i };
}
const coverBuffer = useCoverBuffer({
  rowPositions: (row) => {
    const r = cursorRows.value.rows[row];
    if (!r) return [];
    return Array.from({ length: r.end - r.start }, (_, i) => r.start + i);
  },
  rowCount: () => cursorRows.value.rows.length,
  rowHeight: () => COMPACT_ROW_H_PX,
  coverUrl: (position) => {
    const rom = getRomAt(position);
    return rom ? compactCoverUrl(rom, supportsWebp.value) : null;
  },
  onFlying: (on) => {
    flying.value = on;
  },
});
const scrollEl = computed(() => scrollerRef.value?.containerEl ?? null);
useEventListener(
  scrollEl,
  "scroll",
  () => {
    const el = scrollEl.value;
    if (compact.value && el) coverBuffer.scroll(el.scrollTop, el.clientHeight);
  },
  { passive: true },
);
// Item indices (letter headers included) to cursor-row indices.
function bufferUpdate(range: { first: number; last: number }) {
  if (!compact.value || range.last < range.first) return;
  const { itemIndex } = cursorRows.value;
  if (itemIndex.length === 0) return;
  const rowFor = (item: number) => {
    let lo = 0;
    let hi = itemIndex.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (itemIndex[mid]! < item) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  coverBuffer.update({ first: rowFor(range.first), last: rowFor(range.last) });
}
watch(virtualItems, () => coverBuffer.reset());

const scheduleFetchSync = useDebounceFn(syncFetches, FETCH_DEBOUNCE_MS, {
  // A long fling never pauses, so also fire every 250 ms while it lasts.
  maxWait: 250,
});

// When the virtualItems list itself changes (gallery context switch,
// search invalidate), drop the pending debounced sync. The store's
// `invalidateWindows` / `resetGallery` already aborts every in-flight
// request, so we just clear local state.
watch(virtualItems, () => {
  scheduleFetchSync.cancel();
  // Re-sync against the current viewport so visible rows in the new
  // context start fetching immediately (no debounce: items just
  // changed, the user is staring at skeletons).
  syncFetches(viewportRange.value);
});

// A jump holds its letter under the toolbar until the user scrolls again, so
// a slow landing window still ends up anchored. The cap covers the viewer who
// walks away mid-jump.
const LETTER_JUMP_MAX_MS = 15000;
const jumpLetter = ref<string | null>(null);
let jumpDeadline = 0;

function anchorLetter(letter: string, smooth: boolean) {
  const idx = letterToIndex.value.get(letter);
  if (idx == null) return;
  scrollToItem(idx, smooth);
}

function scrollToItem(idx: number, smooth: boolean) {
  // The section runs under the top bar, so rows land below it in either dock.
  const stickyOffset =
    navHeight.value +
    toolbarHeight.value +
    (layout.value === "list" ? LIST_HEADER_HEIGHT_PX : 0);
  scrollerRef.value?.scrollToIndex(idx, { smooth, stickyOffset });
}

function scrollToLetter(letter: string) {
  jumpLetter.value = letter;
  jumpDeadline = Date.now() + LETTER_JUMP_MAX_MS;
  anchorLetter(letter, true);
  // The viewport-driven fetch sync handles the destination; once the
  // smooth scroll settles, `update:viewportRange` fires and the windows at
  // the landing zone start loading via `syncFetches` (both layouts). No
  // manual prefetch needed.
}

/** Gives the scroll back to the user, whatever a jump was still correcting. */
function endLetterJump() {
  jumpLetter.value = null;
}

/** The letter still worth correcting towards, or null once the cap is up. */
function pendingJumpLetter(): string | null {
  const letter = jumpLetter.value;
  if (!letter) return null;
  if (Date.now() > jumpDeadline) {
    endLetterJump();
    return null;
  }
  return letter;
}

// The smooth scroll animates towards the target the jump computed; anything
// that moved meanwhile (a re-pack, the header rendering) leaves it short, so
// settle onto the letter once the animation stops.
function reanchorToJump() {
  const letter = pendingJumpLetter();
  if (letter) anchorLetter(letter, false);
}

// Three things move a letter out from under the toolbar after a jump: the
// landing window arriving, the covers re-packing the rows, and the view header
// rendering late. Re-anchor on each. Watching the packed items rather than
// `letterToIndex` keeps that map lazy, built only when a jump needs it.
watch(
  [
    virtualItems,
    () => scrollerRef.value?.innerOffsetTop ?? 0,
    () => galleryRoms.loadedWindows.size,
  ],
  reanchorToJump,
);

// ── Search filter (debounced) ───────────────────────────────────────
const { input: searchInput, setSearch } = useDebouncedSearch(searchTerm);

// ── Sort ──────────────────────────────────────────────────────────
// Both affordances (list column headers, grid direction toggle) only
// write the store; `useGalleryOrderUrl` mirrors it to the URL and the
// watch below owns the refetch.
const listSortKey = computed<ListSortKey | null>(() => {
  const key = galleryRoms.effectiveOrderBy;
  return isListSortKey(key) ? key : null;
});

function onListSort(payload: { key: ListSortKey; dir: "asc" | "desc" }) {
  galleryRoms.setOrderBy(payload.key);
  galleryRoms.setOrderDir(payload.dir);
}

// Search's relevance has no sort key; the other views have no unsorted order.
const unsortedLabel = computed(() =>
  props.defaultOrderBy === null ? t("gallery.sort-relevance") : undefined,
);

// The toolbar's sort axes, matching the list column headers.
const sortOptions = computed(() => getSortOptions(props.showPlatformColumn));

// Watching the store rather than refetching inside the handlers also
// covers the URL-driven writes (back/forward, a pasted link). The
// initial URL hydration runs before this watch is set up, so it does
// not echo here.
watch([orderBy, orderDir], () => {
  galleryRoms.invalidateWindows({ reorder: true });
  void galleryRoms.fetchInitialMetadata();
});

// ── Scroll restoration ─────────────────────────────────────────────
async function applyRestoredScroll() {
  const saved = scrollRestoration.restore(route.fullPath);
  if (saved == null) return;
  const root = scrollerRef.value?.containerEl;
  if (!root) return;
  await nextTick();
  root.scrollTop = saved;
}

function saveCurrentScroll(routeFullPath: string) {
  const root = scrollerRef.value?.containerEl;
  if (root) scrollRestoration.save(routeFullPath, root.scrollTop);
}

onBeforeRouteUpdate((to, from) => {
  saveCurrentScroll(from.fullPath);
  // Search, filters, sort and view mode live in the query, so they
  // navigate without leaving the gallery and keep the selection. Only a
  // path change is a real context switch, where it would read as stale.
  if (to.path === from.path) return;
  gallerySelection.clear();
});
onBeforeRouteLeave((_to, from) => {
  saveCurrentScroll(from.fullPath);
  gallerySelection.clear();
});

// Whole-result select-all, shared with the SelectionBar button and
// the list header checkbox.
const { selectAll, selectingAll } = useGallerySelectAll();

// Esc clears the selection, Ctrl/Cmd+A selects the whole result; both
// skip editable elements so the search field's native Cmd+A survives.
function onShellKey(e: KeyboardEvent) {
  if (isEditable(e.target)) return;
  // `selectingAll` keeps Esc working while a whole-result fetch is
  // still in flight with nothing selected yet (clear() abandons it).
  if (e.key === "Escape" && (gallerySelection.enabled || selectingAll.value)) {
    e.preventDefault();
    gallerySelection.clear();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
    e.preventDefault();
    // A held chord repeats keydown at the OS rate; one trigger is enough.
    if (!e.repeat) void selectAll();
  }
}

// Gallery owns its own internal scroll (the RVirtualScroller). The
// section is sized to one viewport exactly, but pixel-rounding
// or transient layout shifts can still produce a stray 1-2px document
// overflow → a phantom doc scrollbar competing with the virtualizer.
// Locking the body's overflow while the shell is mounted guarantees
// the only scrollbar visible on gallery routes is the virtualizer's.
let prevBodyOverflow: string | null = null;

onMounted(() => {
  prevBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
});
useEventListener(window, "keydown", onShellKey);

// Keyboard and controller cursor for the compact grid. The controller's D-pad
// arrives as synthetic arrow keys, so one handler serves both. The cursor is an
// index into the results: a key press is arithmetic over the packed rows, never
// a DOM read, so held keys stay cheap however far the list goes.
const compactCursor = ref<number | null>(null);
let cursorPreferredX: number | null = null;
const cursorRows = computed(() => {
  const rows: CursorRow[] = [];
  const itemIndex: number[] = [];
  virtualItems.value.forEach((item, i) => {
    if (item.kind === "row") {
      rows.push({ start: item.startPosition, end: item.endPosition });
      itemIndex.push(i);
    }
  });
  return { rows, itemIndex };
});
const CURSOR_KEYS: ReadonlySet<string> = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

// The cursor's row stays inside the middle band of the visible area, and the
// scroll follows at a constant speed (linear) rather than jumping. Row tops
// come from a cached prefix sum of the item heights, so a key press is
// arithmetic, not a DOM read.
const FOLLOW_BAND_TOP = 0.35;
const FOLLOW_BAND_BOTTOM = 0.65;
// A jump this many viewports away (Home, End) snaps instead of gliding.
const FOLLOW_SNAP_VIEWPORTS = 3;
// A tap glides to the cursor row in a straight line (no easing); a retarget
// mid-glide restarts from wherever the scroll is.
const GLIDE_MS = 110;
const itemOffsets = computed(() => {
  const items = virtualItems.value;
  const offsets = new Float64Array(items.length + 1);
  for (let i = 0; i < items.length; i++) {
    offsets[i + 1] = offsets[i]! + getItemHeight(items[i]);
  }
  return offsets;
});
const containerEl = () => scrollerRef.value?.containerEl ?? null;
let glideFrom = 0;
let glideTarget = 0;
let glideStart = 0;
let glideFrame = 0;

function glideStep(now: number) {
  const el = containerEl();
  if (!el) {
    glideFrame = 0;
    return;
  }
  const t = Math.min(1, (now - glideStart) / GLIDE_MS);
  el.scrollTop = glideFrom + (glideTarget - glideFrom) * t;
  glideFrame = t < 1 ? requestAnimationFrame(glideStep) : 0;
}
function cancelGlide() {
  if (glideFrame) cancelAnimationFrame(glideFrame);
  glideFrame = 0;
}
function glideTo(top: number) {
  const el = containerEl();
  if (!el) return;
  const max = el.scrollHeight - el.clientHeight;
  const target = Math.min(Math.max(0, top), max);
  const visible = el.clientHeight;
  if (Math.abs(target - el.scrollTop) > visible * FOLLOW_SNAP_VIEWPORTS) {
    cancelGlide();
    el.scrollTop = target;
    return;
  }
  glideFrom = el.scrollTop;
  glideTarget = target;
  glideStart = performance.now();
  if (!glideFrame) glideFrame = requestAnimationFrame(glideStep);
}

// scrollTop that puts a row's card at the middle of the visible area (below the
// sticky bars).
function centeredTop(row: number): number {
  const el = containerEl();
  if (!el) return 0;
  const sticky = navHeight.value + toolbarHeight.value;
  const idx = cursorRows.value.itemIndex[row] ?? 0;
  const rowTop =
    (scrollerRef.value?.innerOffsetTop ?? 0) + itemOffsets.value[idx]!;
  return (
    rowTop + COMPACT_CARD_H_PX / 2 - sticky - (el.clientHeight - sticky) / 2
  );
}

// The cursor row whose center is nearest the middle of the visible area at
// `scrollTop`: a binary search over the real row tops, letter headers included.
function rowAt(scrollTop: number): number {
  const { rows, itemIndex } = cursorRows.value;
  const el = containerEl();
  if (!el || rows.length === 0) return 0;
  const sticky = navHeight.value + toolbarHeight.value;
  const mid = scrollTop + sticky + (el.clientHeight - sticky) / 2;
  const base = scrollerRef.value?.innerOffsetTop ?? 0;
  const centerOf = (r: number) =>
    base + itemOffsets.value[itemIndex[r]!]! + COMPACT_CARD_H_PX / 2;
  let lo = 0;
  let hi = rows.length - 1;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (centerOf(m) < mid) lo = m + 1;
    else hi = m;
  }
  return lo > 0 && mid - centerOf(lo - 1) < centerOf(lo) - mid ? lo - 1 : lo;
}

// Hold Up or Down (keyboard or D-pad) and the grid scrolls at a constant,
// ramping speed with the card at the middle of the screen as the selection.
const cruising = ref(false);
const cruise = useGridCruise({
  scroller: containerEl,
  rowHeight: () => COMPACT_ROW_H_PX,
  scrollTopFor: centeredTop,
  rowCount: () => cursorRows.value.rows.length,
  rowAt,
  onStart: () => {
    // A glide in flight is heading for the cursor's row: land it first, so the
    // cruise starts from where the cursor is and not from a stale scroll.
    const el = containerEl();
    if (glideFrame && el) el.scrollTop = glideTarget;
    cancelGlide();
    cruising.value = true;
  },
  onRow: (row) => selectRow(row),
  onEnd: (row) => {
    cruising.value = false;
    if (row === null) return;
    selectRow(row);
    showBackdrop(compactCursor.value);
    glideTo(centeredTop(row));
  },
});

// The left stick as an analog scroll: it creeps with the push, the selection
// follows the center past a dead band, and it settles on release. The grid
// claims the stick's Y axis while it is on screen, so the pad stops sending
// Up and Down for it.
// A dialog check is a page-wide query, so it runs only once the stick is
// pushed (the stick loop asks every frame) and at most every 250 ms then.
let dialogCheckedAt = 0;
let dialogIsOpen = false;
function dialogOpen(): boolean {
  const now = performance.now();
  if (now - dialogCheckedAt > 250) {
    dialogCheckedAt = now;
    dialogIsOpen = !!document.querySelector('[role="dialog"], dialog[open]');
  }
  return dialogIsOpen;
}
const stickScroll = useStickScroll({
  scroller: containerEl,
  rowHeight: () => COMPACT_ROW_H_PX,
  scrollTopFor: centeredTop,
  rowCount: () => cursorRows.value.rows.length,
  currentRow: () =>
    compactCursor.value === null
      ? null
      : rowOfIndex(cursorRows.value.rows, compactCursor.value),
  blocked: () =>
    cruise.isActive() ||
    glideFrame !== 0 ||
    isEditable(document.activeElement) ||
    dialogOpen(),
  onStart: () => {
    cancelGlide();
    cruising.value = true;
    const { rows } = cursorRows.value;
    const el = containerEl();
    if (compactCursor.value === null && el && rows.length) {
      compactCursor.value = rows[rowAt(el.scrollTop)]!.start;
    }
  },
  onRow: (row) => selectRow(row),
  // Release leaves the view where it is: the selection takes the card nearest
  // the center and nothing glides, so a light push never ends in a jump.
  onEnd: (row) => {
    cruising.value = false;
    const el = containerEl();
    if (row === null || !el) return;
    selectRow(rowAt(el.scrollTop));
    showBackdrop(compactCursor.value);
  },
});
let releaseStickY: (() => void) | null = null;
watch(
  () => compact.value && layout.value === "grid",
  (on) => {
    releaseStickY?.();
    releaseStickY = null;
    stickScroll.stop();
    if (!on) return;
    releaseStickY = claimStickY();
    stickScroll.start();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  stickScroll.stop();
  releaseStickY?.();
});

// The card in `row` nearest the column the cursor has been holding.
function selectRow(row: number) {
  const { rows } = cursorRows.value;
  const target = rows[row];
  const here = compactCursor.value;
  if (!target || here === null) return;
  const x =
    cursorPreferredX ??
    centerX(
      rows[rowOfIndex(rows, here)]!,
      here,
      () => COMPACT_CARD_W_PX,
      COMPACT_GAP_PX,
    );
  cursorPreferredX = x;
  compactCursor.value = nearestInRow(
    target,
    x,
    () => COMPACT_CARD_W_PX,
    COMPACT_GAP_PX,
  );
}

function stopFollow() {
  cancelGlide();
  cruise.cancel();
}

// Keep the cursor's row inside the middle band of the visible area.
function followCursor(position: number) {
  const el = containerEl();
  const { rows, itemIndex } = cursorRows.value;
  const idx = itemIndex[rowOfIndex(rows, position)];
  if (!el || idx === undefined) return;
  const sticky = navHeight.value + toolbarHeight.value;
  const visibleHeight = el.clientHeight - sticky;
  const rowTop =
    (scrollerRef.value?.innerOffsetTop ?? 0) + itemOffsets.value[idx]!;
  const center = rowTop + COMPACT_CARD_H_PX / 2;
  // Measure from where the glide is heading, so quick taps keep tracking.
  const from = glideFrame ? glideTarget : el.scrollTop;
  const bandTop = from + sticky + visibleHeight * FOLLOW_BAND_TOP;
  const bandBottom = from + sticky + visibleHeight * FOLLOW_BAND_BOTTOM;
  // Scroll only toward the cursor, and only as far as the scroller can go: at
  // the very bottom or top the cursor sits outside the band and must be free to
  // walk back toward it without the view jumping.
  const max = el.scrollHeight - el.clientHeight;
  if (center < bandTop) {
    const to = Math.max(0, center - sticky - visibleHeight * FOLLOW_BAND_TOP);
    if (to < from) glideTo(to);
  } else if (center > bandBottom) {
    const to = Math.min(
      max,
      center - sticky - visibleHeight * FOLLOW_BAND_BOTTOM,
    );
    if (to > from) glideTo(to);
  }
}
onBeforeUnmount(stopFollow);
// The wheel or a touch takes the scroll back from the cursor and from a letter jump.
function onManualScroll() {
  stopFollow();
  endLetterJump();
}

function onCompactKey(e: KeyboardEvent) {
  if (!compact.value || layout.value !== "grid" || e.defaultPrevented) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  // Only when focus is on the page itself or inside the gallery: a dialog or a
  // text field keeps its own keys.
  const target = e.target as Node | null;
  const inGallery =
    target === document.body ||
    target === document.documentElement ||
    (!!target && !!sectionEl.value?.contains(target));
  if (!inGallery || isEditable(e.target)) return;
  const { rows, itemIndex } = cursorRows.value;
  if (rows.length === 0) return;

  if (e.key === "Enter" || e.key === " ") {
    const here = compactCursor.value;
    // A focused card is a link: its own click already routes it.
    if (here === null || (e.target as Element).closest?.("a.r-v2-compact-card"))
      return;
    const rom = getRomAt(here);
    if (!rom) return;
    e.preventDefault();
    void router.push(`/rom/${rom.id}`);
    return;
  }
  if (!CURSOR_KEYS.has(e.key)) return;
  e.preventDefault();
  e.stopPropagation();

  const range = viewportRange.value;
  if (compactCursor.value === null) {
    // The first press only shows the cursor, on the top-left card in view.
    const top = Math.max(
      0,
      itemIndex.findIndex((i) => i >= range.first),
    );
    compactCursor.value = rows[top]!.start;
    cursorPreferredX = null;
    followCursor(compactCursor.value);
    return;
  }
  // The wheel, a drag or the scrollbar leave the cursor behind. Bring it onto
  // the visible rows first, so a key moves from where you are looking and does
  // not scroll back to where the cursor was.
  const el = containerEl();
  if (el && !glideFrame && !cruise.isActive()) {
    const here = rowOfIndex(rows, compactCursor.value);
    const sticky = navHeight.value + toolbarHeight.value;
    const top =
      (scrollerRef.value?.innerOffsetTop ?? 0) +
      itemOffsets.value[itemIndex[here]!]!;
    if (
      top + COMPACT_CARD_H_PX < el.scrollTop + sticky ||
      top > el.scrollTop + el.clientHeight
    ) {
      compactCursor.value = nearestInRow(
        rows[rowAt(el.scrollTop)]!,
        cursorPreferredX ?? COMPACT_CARD_W_PX / 2,
        () => COMPACT_CARD_W_PX,
        COMPACT_GAP_PX,
      );
    }
  }
  // A tap steps a row; the first repeat of a held Up/Down hands over to the
  // cruise. A real keyboard event is trusted; the pad's synthetic ones are not.
  if (
    (e.key === "ArrowUp" || e.key === "ArrowDown") &&
    cruise.feed(e.key, { via: e.isTrusted ? "key" : "pad", repeat: e.repeat })
  ) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  const next = moveCursor(
    e.key as CursorKey,
    compactCursor.value,
    cursorPreferredX,
    rows,
    () => COMPACT_CARD_W_PX,
    COMPACT_GAP_PX,
    Math.max(1, range.last - range.first - 1),
  );
  cursorPreferredX = next.preferredX;
  compactCursor.value = next.index;
  followCursor(next.index);
}
useEventListener(window, "keydown", onCompactKey, { capture: true });
useEventListener(window, "keyup", (e: KeyboardEvent) => cruise.keyUp(e.key));
watch(compactCursor, (position) => showBackdrop(position));

// The cursor is painted on the DOM, not passed down as a prop: a prop would
// re-render every mounted row on each step, which a held key does 8 to 20
// times a second.
let paintedCursor: number | null = null;
function setCursorClass(card: Element, on: boolean) {
  card.classList.toggle("is-cursor", on);
  card.setAttribute("tabindex", on ? "0" : "-1");
}
function cardAt(position: number): Element | null {
  return document.getElementById(`cc-${position}`);
}
function paintCursorIn(row: HTMLElement) {
  const position = compactCursor.value;
  if (position === null) return;
  const card = row.querySelector(`a.r-v2-compact-card[data-pos="${position}"]`);
  if (card && !card.classList.contains("is-cursor")) setCursorClass(card, true);
}
watch(
  compactCursor,
  (position) => {
    if (paintedCursor !== null) {
      const old = cardAt(paintedCursor);
      if (old) setCursorClass(old, false);
    }
    paintedCursor = position;
    const card = position === null ? null : cardAt(position);
    if (card) setCursorClass(card, true);
  },
  { flush: "sync" },
);
// A new result set or a different card drops the old cursor.
watch([() => galleryRoms.total, compact], () => {
  compactCursor.value = null;
  cursorPreferredX = null;
});

onBeforeUnmount(() => {
  // A press still in flight would otherwise fire its timer into whatever
  // replaces this gallery.
  selectionInput.cancel();
  // Selection is gallery-scoped: leaving the shell drops it so a
  // navigation back to a non-gallery view (Home, Settings) doesn't
  // keep stale picks alive.
  gallerySelection.clear();
  scheduleFetchSync.cancel();
  // When leaving the gallery entirely, stop any in-flight window fetches so
  // navigating away mid-scroll doesn't keep the network / backend busy.
  // Keeps the hydrated cache so returning to the same gallery is instant.
  galleryRoms.abortInFlight();
  // Drop the debug stats so the overlay doesn't show stale gallery numbers
  // on the next (non-gallery) route.
  virtualDebug.clear();
  // Restore body overflow so non-gallery routes scroll normally.
  document.body.style.overflow = prevBodyOverflow ?? "";
  prevBodyOverflow = null;
});

// ── Slot helpers ────────────────────────────────────────────────────
function getRomAt(p: number) {
  return galleryRoms.getRomAt(p);
}

function rowPositions(row: {
  startPosition: number;
  endPosition: number;
}): number[] {
  const out: number[] = [];
  for (let p = row.startPosition; p < row.endPosition; p++) out.push(p);
  return out;
}

// Each cell with its rom, read once: the template would otherwise read the
// store three times per card on every render.
function rowCells(row: { startPosition: number; endPosition: number }) {
  return rowPositions(row).map((p) => ({ p, rom: getRomAt(p) }));
}

type RowItem = Extract<GalleryItem, { kind: "row" }>;
type LetterHeaderItem = Extract<GalleryItem, { kind: "letter-header" }>;
type EmptyItem = Extract<GalleryItem, { kind: "empty" }>;
type ListRowItem = Extract<GalleryItem, { kind: "list-row" }>;
type SkeletonRowItem = Extract<GalleryItem, { kind: "skeleton-row" }>;
const asRow = (i: GalleryItem) => i as RowItem;
const asLetterHeader = (i: GalleryItem) => i as LetterHeaderItem;
const asEmpty = (i: GalleryItem) => i as EmptyItem;
const asListRow = (i: GalleryItem) => i as ListRowItem;
const asSkeletonRow = (i: GalleryItem) => i as SkeletonRowItem;
const itemKind = (i: GalleryItem) => i.kind;

// The desktop list header is the grid's first row; the compact one is a
// toolbar above the grid.
const listHeaderInGrid = computed(
  () => layout.value === "list" && !smAndDown.value,
);

// The rows form one ARIA grid, which leaves out the page header and toolbar.
const gridAttrs = computed(() => {
  const items = virtualItems.value;
  if (items.length === 0 && !listHeaderInGrid.value) return undefined;
  const loaded = items.some((i) => i.kind === "row" || i.kind === "list-row");
  return {
    role: "grid",
    "aria-label": t("common.games"),
    "aria-multiselectable": true,
    "aria-busy": !loaded && !items.some((i) => i.kind === "empty"),
    "aria-rowcount": items.length + (listHeaderInGrid.value ? 1 : 0),
    "aria-colcount": listHeaderInGrid.value
      ? getListColumns(props.showPlatformColumn).length
      : undefined,
  };
});

function rowIndex(index: number): number {
  return index + 1 + (listHeaderInGrid.value ? 1 : 0);
}

// A list row is its own `role="row"`; skeletons stay out of the grid.
function itemAttrs(item: GalleryItem, index: number) {
  switch (item.kind) {
    case "letter-header":
    case "row":
    case "empty":
      return { role: "row", "aria-rowindex": rowIndex(index) };
    case "skeleton-row":
    case "skeleton-list-row":
      return { "aria-hidden": true };
    default:
      return {};
  }
}

function isRomSelected(position: number): boolean {
  const rom = getRomAt(position);
  return !!rom && gallerySelection.isSelected(rom.id);
}

// Stable identity for the virtualiser. Each GalleryItem carries a content-
// derived `key` (`row-${start}`, `lh-${letter}`, `lr-${p}`, …); feeding it to
// RVirtualScroller as `get-item-key` lets Vue MATCH rows across a re-pack and
// MOVE the unchanged ones instead of patching by array index. Index-keying
// (the default) reassigns every slot's content when a re-pack inserts/removes
// a row above the viewport, remounting every visible card (image re-decode +
// reveal). With identity keys, a moved row keeps its DOM and its inner cards
// (keyed by `:key="p"`) patch in place. `unknown` matches the prop signature.
const galleryItemKey = (item: unknown): string => (item as GalleryItem).key;

// View-facing surface. Methods only; internal state stays internal.
defineExpose({
  /** Re-apply the previously-saved scroll position for the current route
   * (typically called by the view at the end of its load flow). */
  applyRestoredScroll,
  /** Force-save the current scrollTop to a specific routeFullPath.
   * The shell already saves on `onBeforeRouteUpdate` / `onBeforeRouteLeave`
   * automatically; this is for one-off checkpoints. */
  saveCurrentScroll,
});
</script>

<template>
  <section
    ref="sectionEl"
    class="r-v2-shell"
    :class="{
      'r-v2-shell--list': layout === 'list',
      'r-v2-shell--floating': toolbarPosition === 'floating',
      'r-v2-shell--no-strip': !stripVisible,
      'r-v2-shell--flying': flying,
      'r-v2-shell--cruising': cruising,
    }"
    :style="{
      '--r-v2-shell-toolbar-h': `${toolbarHeight}px`,
      '--r-v2-shell-pin-distance': `${pinDistance}px`,
      '--r-cover-ratio': coverAspectRatio,
      '--r-list-min-w': `${listMinWidth}px`,
    }"
  >
    <RVirtualScroller
      ref="scrollerRef"
      :items="virtualItems"
      :get-item-height="getItemHeight"
      :get-item-key="galleryItemKey"
      :offset-shift="listOffsetShift"
      :overscan="virtualOverscan"
      :min-content-width="
        layout === 'list' && !smAndDown ? listMinWidth : undefined
      "
      class="r-v2-shell__scroller"
      :body-attrs="gridAttrs"
      :tabindex="-1"
      @click="onCompactClick"
      @pointerover.passive="onCompactPointerOver"
      @wheel.passive="onManualScroll"
      @touchstart.passive="stopFollow"
      @pointerdown.passive="endLetterJump"
      @keydown="endLetterJump"
      @scrollend="reanchorToJump"
      @update:viewport-range="onViewportRangeChange"
    >
      <!-- HEADER (Section 1) + TOOLBAR (Section 2). Both live in the
           scroller's flow: the header scrolls away under the top bar, and
           the toolbar pins right below the top bar as a glass strip. -->
      <template #prepend>
        <template v-if="hasHeader">
          <div class="r-v2-shell__header">
            <slot name="header" />
          </div>
          <RDivider class="r-v2-shell__header-divider" />
        </template>
        <div v-else class="r-v2-shell__nav-spacer" />

        <template v-if="toolbarPosition === 'header'">
          <div :ref="bindSentinel" aria-hidden="true" />
          <div
            :ref="bindToolbar"
            class="r-v2-shell__toolbar r-pinned-toolbar"
            :class="{ 'r-pinned-toolbar--pinned': pinned }"
          >
            <GalleryToolbar
              :group-by="groupBy"
              :layout="layout"
              :position="toolbarPosition"
              :sort-dir="orderDir"
              :sort-key="listSortKey"
              :sort-key-items="sortOptions"
              :unsorted-label="unsortedLabel"
              :unsorted="galleryRoms.effectiveOrderBy === null"
              show-search
              :search="searchInput"
              :search-placeholder="searchPlaceholder"
              :autofocus-search="autofocusSearch"
              show-filter
              :filter-active-count="filterActiveCount"
              @update:group-by="groupBy = $event"
              @update:layout="layout = $event"
              @update:sort-dir="galleryRoms.setOrderDir"
              @update:sort-key="galleryRoms.setOrderBy"
              @update:search="setSearch"
              @click:filter="filterDrawerOpen = true"
            >
              <template #actions>
                <AlphaJumpMenu
                  v-if="jumpMenuVisible"
                  :available="availableLetters"
                  :current="currentLetter"
                  :direction="orderDir"
                  @pick="scrollToLetter"
                />
              </template>
            </GalleryToolbar>
          </div>
        </template>

        <!-- LIST COLUMN HEADER: sticky below the toolbar in list mode.
             Shares `LIST_GRID_TEMPLATE` with every GameListRow underneath
             so columns align. Header click cycles asc/desc into the
             store's orderBy/orderDir. -->
        <template v-if="layout === 'list' && !listHeaderInGrid">
          <div
            v-if="toolbarPosition === 'floating'"
            ref="listHeaderSentinel"
            aria-hidden="true"
          />
          <GameListHeader
            class="r-v2-shell__list-header"
            :class="{ 'r-pinned-list-header': listHeaderPinned }"
            :sort-key="listSortKey"
            :sort-dir="orderDir"
            :show-platform-column="showPlatformColumn"
            :unsorted-label="unsortedLabel"
            :unsorted="galleryRoms.effectiveOrderBy === null"
            @sort="onListSort"
            @unsort="galleryRoms.setOrderBy(null)"
          />
        </template>
      </template>

      <template v-if="listHeaderInGrid" #head>
        <div
          v-if="toolbarPosition === 'floating'"
          ref="listHeaderSentinel"
          aria-hidden="true"
        />
        <GameListHeader
          class="r-v2-shell__list-header"
          :class="{ 'r-pinned-list-header': listHeaderPinned }"
          :sort-key="listSortKey"
          :sort-dir="orderDir"
          :show-platform-column="showPlatformColumn"
          aria-rowindex="1"
          :unsorted-label="unsortedLabel"
          :unsorted="galleryRoms.effectiveOrderBy === null"
          @sort="onListSort"
          @unsort="galleryRoms.setOrderBy(null)"
        />
      </template>

      <!-- GRID / TABLE (Section 3): letter-headers + rows of cards in
           grid/grouped mode, or a single RTable in list mode. Skeleton
           rows render while the first window is in flight. The empty
           / not-found state replaces everything below the toolbar
           with a single message. -->
      <template #default="{ item, index }">
        <div
          class="r-v2-shell__item"
          v-bind="itemAttrs(item as GalleryItem, index)"
        >
          <RLetterHeading
            v-if="itemKind(item as GalleryItem) === 'letter-header'"
            role="rowheader"
            :label="asLetterHeader(item as GalleryItem).letter"
          />

          <div
            v-else-if="itemKind(item as GalleryItem) === 'row'"
            v-near
            class="r-v2-shell__row"
            :style="compact ? entranceStyle(index) : undefined"
          >
            <div
              v-for="({ p, rom }, slotIdx) in rowCells(
                asRow(item as GalleryItem),
              )"
              :key="p"
              role="gridcell"
              class="r-v2-shell__cell"
              :aria-selected="rom ? isRomSelected(p) : undefined"
            >
              <template v-if="compact">
                <GameCardCompact
                  v-if="rom"
                  :rom="rom"
                  :webp="supportsWebp"
                  :position="p"
                />
                <span v-else class="r-v2-compact-skeleton" />
              </template>
              <template v-else>
                <GameCard
                  v-if="rom"
                  class="r-v2-card-fade"
                  :style="{ '--card-fade-i': slotIdx }"
                  :rom="rom"
                  :webp="supportsWebp"
                  :show-platform-badge="showPlatformBadge"
                  selectable
                  :position="p"
                  @ratio="onCardRatio"
                />
                <GameCardSkeleton v-else />
              </template>
            </div>
          </div>

          <GameListRow
            v-else-if="itemKind(item as GalleryItem) === 'list-row'"
            :aria-rowindex="rowIndex(index)"
            :position="asListRow(item as GalleryItem).position"
            :webp="supportsWebp"
            :show-platform-column="showPlatformColumn"
            expandable
            :expanded="
              listExpansion.isExpanded(asListRow(item as GalleryItem).position)
            "
            :detail-height="
              listExpansion.panelHeight(asListRow(item as GalleryItem).position)
            "
            @ratio="onCardRatio"
            @toggle-expand="
              listExpansion.toggle(asListRow(item as GalleryItem).position)
            "
          />

          <GameListSkeletonRow
            v-else-if="itemKind(item as GalleryItem) === 'skeleton-list-row'"
            :show-platform-column="showPlatformColumn"
          />

          <div
            v-else-if="itemKind(item as GalleryItem) === 'empty'"
            role="gridcell"
            class="r-v2-shell__empty"
          >
            <REmptyState
              :icon="emptyIcon"
              :title="asEmpty(item as GalleryItem).message"
            />
          </div>

          <div
            v-else-if="itemKind(item as GalleryItem) === 'skeleton-row'"
            class="r-v2-shell__row"
          >
            <GameCardSkeleton
              v-for="n in asSkeletonRow(item as GalleryItem).cards"
              :key="`sk-${n}`"
            />
          </div>
        </div>
      </template>
    </RVirtualScroller>

    <!-- ALPHASTRIP: A-Z jump column on the right edge of the section.
         Phones and tablets jump from the toolbar instead (AlphaJumpMenu). -->
    <AlphaStrip
      v-if="stripVisible"
      ref="stripRef"
      class="r-v2-shell__strip"
      :available="availableLetters"
      :current="currentLetter"
      :visible="visibleLettersSet"
      :direction="orderDir"
      @pick="scrollToLetter"
    />

    <BackToTopButton
      v-if="!(smAndDown && gallerySelection.enabled)"
      class="r-v2-shell__back-to-top"
      :scroller="scrollerEl"
      :scroll-top="scrollTopNow"
      @scroll-to-top="endLetterJump"
    />

    <!-- FLOATING-DOCK TOOLBAR: the alternative dock; sits permanently
         in the top-right and never scrolls. Mutually exclusive with
         the in-scroller header dock above. -->
    <GalleryToolbar
      v-if="toolbarPosition === 'floating'"
      class="r-v2-shell__floating"
      :group-by="groupBy"
      :layout="layout"
      :position="toolbarPosition"
      :sort-dir="orderDir"
      :sort-key="listSortKey"
      :sort-key-items="sortOptions"
      :unsorted-label="unsortedLabel"
      :unsorted="galleryRoms.effectiveOrderBy === null"
      show-filter
      :filter-active-count="filterActiveCount"
      @update:group-by="groupBy = $event"
      @update:layout="layout = $event"
      @update:sort-dir="galleryRoms.setOrderDir"
      @update:sort-key="galleryRoms.setOrderBy"
      @click:filter="filterDrawerOpen = true"
    >
      <template #actions>
        <AlphaJumpMenu
          v-if="jumpMenuVisible"
          :available="availableLetters"
          :current="currentLetter"
          :direction="orderDir"
          @pick="scrollToLetter"
        />
      </template>
    </GalleryToolbar>

    <!-- FILTER DRAWER: owned by the shell so every gallery view gets
         it for free. Forwards `showPlatformsInFilter` from the view so
         single-platform pages can hide the platform multi-select. -->
    <FilterDrawer
      v-model="filterDrawerOpen"
      :show-platforms-filter="showPlatformsInFilter"
    />

    <!-- SELECTION BAR: floating bottom panel surfaced whenever the
         user has selected at least one ROM. Owns the bulk actions
         (favorite, collections, download, refresh, delete). Stays
         outside the scroller so it never scrolls away. -->
    <SelectionBar />
  </section>
</template>

<style scoped>
/* The one-time entrance: a short rise and fade, staggered by row. */
.r-v2-shell__row[style*="--enter-i"] {
  animation: r-v2-shell-enter 176ms var(--r-motion-ease-out) both;
  animation-delay: calc(var(--enter-i) * 19ms);
}
@keyframes r-v2-shell-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .r-v2-shell__row[style*="--enter-i"] {
    animation-name: r-v2-shell-enter-reduced;
    animation-delay: 0ms;
  }
  @keyframes r-v2-shell-enter-reduced {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
}
/* While cruising or flying, hover and selection backgrounds hold still (the
   cards under a stationary pointer would flicker); they fade in on stop. */
.r-v2-shell--cruising :deep(.r-v2-compact-card),
.r-v2-shell--flying :deep(.r-v2-compact-card) {
  pointer-events: none;
  transition: none;
}
/* A flying scroll shows text only; covers come back when it settles. */
.r-v2-shell--flying :deep(.r-v2-compact-card::before) {
  background-image: none;
}
.r-v2-shell {
  /* AlphaStrip footprint = letter column (`--r-alpha-strip-w`, a global
     token) + gap to the viewport edge. */
  --r-alpha-strip-gap: var(--r-space-3);
  /* The strip's footprint, added to the scroller's right gutter. */
  --r-v2-shell-strip: calc(var(--r-alpha-strip-w) + var(--r-alpha-strip-gap));
  /* Where the right-anchored overlays sit: clear of the scrollbar and the inset. */
  --r-v2-shell-edge-r: calc(
    var(--r-v2-shell-scrollbar-w, 0px) + var(--r-safe-r)
  );
  /* Lets the strip (a sibling) animate against the scroller's scroll. */
  timeline-scope: --r-v2-shell-scroll;
  flex: 1;
  display: flex;
  overflow: hidden;
  /* Explicit viewport-relative height instead of `height: 100%`.
     The parent `<main>` is a flex item, and percentage heights on
     descendants of flex-computed boxes don't always resolve in every
     browser / stacking context; when they fail to resolve the
     section becomes content-sized, the scroller inside ends up with
     `height: auto`, and overflow-y stops doing anything because
     there's nothing to overflow. A viewport height bypasses that
     fragility entirely. `dvh` (not `vh`) so the section
     matches the mobile visible viewport instead of the larger address-bar-
     hidden one, which would otherwise spill below the fold. */
  height: 100vh;
  height: 100dvh;
  /* Run up under the fixed top bar (<main> reserves its height with a top
     padding) so the header and cards scroll behind its glass, like Home. */
  margin-top: calc(-1 * var(--r-nav-h));
  /* Out of the app shell's safe-area padding to the screen edges, so the pinned
     glass spans them; the scroller pads back in. */
  margin-inline: calc(-1 * var(--r-safe-l)) calc(-1 * var(--r-safe-r));
  position: relative;
}

/* On sm-and-down the section keeps its full-viewport height so cards
   scroll UNDER the translucent bottom tab bar (the glass effect). The layout
   <main> adds a bottom padding for the bar (natural-flow views need it);
   cancel it here with a matching negative margin so this full-height section
   doesn't push the document past one viewport; otherwise a second, global
   scroll stacks on top of the internal one. The scroller's bottom spacer
   (below) lifts the last row clear of the bar. */
html[data-bp~="sm-and-down"] .r-v2-shell {
  margin-bottom: calc(-1 * (var(--r-bottom-nav-h) + var(--r-safe-b)));
}
/* No strip to leave room for: phones and tablets jump from the toolbar, and
   a sort the letters can't address has no jump at all. */
.r-v2-shell--no-strip {
  --r-v2-shell-strip: 0px;
}

/* Compact list mode: the rows and their column header run to the screen
   edges, out of the scroller's gutter. Each keeps that gutter as its own
   padding, so only the separators and the row fill reach the edge. The shell
   publishes how far to bleed and the rows apply it themselves, so no row's
   class name is load-bearing in here. */
html[data-bp~="sm-and-down"] .r-v2-shell {
  --r-list-bleed: var(--r-row-pad);
}
html[data-bp~="sm-and-down"] .r-v2-shell__list-header {
  margin-inline: calc(-1 * var(--r-list-bleed, 0px));
}
/* Desktop list mode: the column rows and their header run out to the left
   screen edge the same way. The right gutter stays, under the AlphaStrip. */
html[data-bp~="md-and-up"] .r-v2-shell {
  --r-list-bleed-start: var(--r-row-pad);
}
html[data-bp~="md-and-up"] .r-v2-shell__list-header {
  margin-inline-start: calc(-1 * var(--r-list-bleed-start));
  padding-inline-start: max(var(--r-space-3), var(--r-list-bleed-start));
  /* Match the rows' natural width so the column header scrolls horizontally
     in step with them when the list is wider than the viewport. */
  min-width: calc(var(--r-list-min-w) + var(--r-list-bleed-start));
}

/* The horizontal pads live here so all in-flow content (header, toolbar,
   rows) shares one column. */
.r-v2-shell__scroller {
  flex: 1;
  height: 100%;
  scroll-timeline: --r-v2-shell-scroll block;
  /* A stable gutter keeps the row packing from shifting when the content
     starts or stops overflowing. */
  scrollbar-gutter: stable;
  padding: 0 calc(var(--r-gutter-r) + var(--r-v2-shell-strip)) 60px
    var(--r-gutter-l);
}

.r-v2-shell__item {
  width: 100%;
}

/* Header band: `display: flow-root` establishes a new block-formatting
   context so child margins don't collapse out visually. */
.r-v2-shell__header {
  display: flow-root;
  padding-top: calc(var(--r-nav-h) + 32px);
}
/* Without a header this clears the top bar instead; the scroller's padding
   can't, as it would also offset the sticky toolbar. */
.r-v2-shell__nav-spacer {
  height: var(--r-nav-h);
}

/* Divider between header and toolbar; scrolls away with the header. */
.r-v2-shell__header-divider {
  margin-bottom: 16px;
}

/* Flow-packed wrapping row: same-height, natural-width cards. The packer
   sized it to fit, so `nowrap` is safe; gaps match the packer (12) and the
   chrome math (18). `flex-start` pins every card to the same top. */
.r-v2-shell__row {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 18px;
}
/* Never shrink: float rounding can push a "just fits" row a hair over, and
   shrinking a fixed-height card would crop its cover. Take ragged overflow
   instead (also keeps skeletons, default shrink:1, at their packed width). */
/* A cell has no box of its own, so the card inside is the flex item. */
.r-v2-shell__cell {
  display: contents;
}
.r-v2-shell__cell > * {
  flex-shrink: 0;
}
/* A compact card that has not loaded yet: its own size, so nothing shifts. */
.r-v2-compact-skeleton {
  display: block;
  width: var(--r-compact-w);
  height: var(--r-compact-h);
  border-radius: var(--r-radius-art);
  background: color-mix(in srgb, var(--r-color-fg) 7%, transparent);
}

/* Card reveal animation (.r-v2-card-fade) lives in global.css, shared
   with the Home dashboard rows. */

.r-v2-shell__empty {
  padding: var(--r-space-6) 0;
}

/* Only the rows share their width with the strip column; the header, the
   divider and the toolbar run to the right edge over it. */
.r-v2-shell__header,
.r-v2-shell__header-divider,
.r-v2-shell__toolbar {
  margin-right: calc(-1 * var(--r-v2-shell-strip));
}

/* When the list scrolls horizontally (columns wider than the viewport), the
   page chrome (view header, divider and in-flow toolbar) belongs to the
   page, not the table, so pin them to the left (`left: 0`). They stay in place
   while only the column header and rows scroll sideways. `left` engages only
   while the scroller has horizontal overflow, i.e. in list mode. */
.r-v2-shell--list .r-v2-shell__header,
.r-v2-shell--list .r-v2-shell__header-divider,
.r-v2-shell--list .r-v2-shell__toolbar {
  position: sticky;
  left: 0;
}

/* List column header: sticky just below the pinned toolbar, and under it
   (z-index 3 vs 4) so it never intercepts the toolbar's pointer events. */
.r-v2-shell__list-header {
  position: sticky;
  top: calc(var(--r-nav-h) + var(--r-v2-shell-toolbar-h));
  z-index: 3;
}
/* Its pinned glass also runs under the strip column, out to the right edge. */
.r-v2-shell__list-header::before {
  right: calc(-1 * (var(--r-gutter-r) + var(--r-v2-shell-strip)));
}

/* The strip overlays the scroller's right gutter from the pinned toolbar's
   bottom edge, shifted down with the toolbar until it pins. */
.r-v2-shell .r-v2-shell__strip {
  position: absolute;
  top: calc(var(--r-nav-h) + var(--r-v2-shell-toolbar-h));
  right: var(--r-v2-shell-edge-r);
  bottom: 0;
  z-index: 5;
  justify-content: flex-start;
  transform: translateY(var(--r-v2-shell-strip-shift, 0px));
}
/* The column header's glass spans the strip column, so the letters start below it. */
.r-v2-shell--list .r-v2-shell__strip {
  top: calc(
    var(--r-nav-h) + var(--r-v2-shell-toolbar-h) + var(--r-list-header-h)
  );
}
/* The floating dock sits over the strip's top; centre the letters clear of it. */
.r-v2-shell--floating .r-v2-shell__strip {
  justify-content: safe center;
}
/* Shifted down, the strip's end runs below the viewport by the same amount;
   this spacer keeps its last letters scrollable into view. */
.r-v2-shell .r-v2-shell__strip::after {
  content: "";
  flex: none;
  height: var(--r-v2-shell-strip-shift, 0px);
}
@supports (animation-timeline: scroll()) and (timeline-scope: --a) {
  .r-v2-shell .r-v2-shell__strip,
  .r-v2-shell .r-v2-shell__strip::after {
    animation: r-v2-shell-strip-follow linear both;
    animation-timeline: --r-v2-shell-scroll;
    animation-range: 0px var(--r-v2-shell-pin-distance, 0px);
  }
  .r-v2-shell .r-v2-shell__strip::after {
    animation-name: r-v2-shell-strip-spacer;
  }
}
@keyframes r-v2-shell-strip-follow {
  from {
    transform: translateY(var(--r-v2-shell-pin-distance, 0px));
  }
  to {
    transform: none;
  }
}
@keyframes r-v2-shell-strip-spacer {
  from {
    height: var(--r-v2-shell-pin-distance, 0px);
  }
  to {
    height: 0;
  }
}

/* Bottom right, just inside the strip column and clear of the scrollbar. */
.r-v2-shell__back-to-top {
  position: absolute;
  right: calc(
    var(--r-v2-shell-strip) + var(--r-v2-shell-edge-r) + var(--r-space-2)
  );
  bottom: var(--r-space-6);
  z-index: 6;
}
/* No strip: line up with the cards' right edge instead. */
.r-v2-shell--no-strip .r-v2-shell__back-to-top {
  right: calc(var(--r-row-pad) + var(--r-v2-shell-edge-r));
}
html[data-bp~="sm-and-down"] .r-v2-shell__back-to-top {
  bottom: calc(var(--r-bottom-nav-h) + var(--r-safe-b) + var(--r-space-4));
}

/* The section runs under the top bar; keep the floating dock below it. */
.r-v2-shell .r-v2-shell__floating {
  top: calc(var(--r-nav-h) + 14px);
  margin-right: var(--r-v2-shell-edge-r);
}

/* Smaller cards on phones. Matches GameCard's own xs `--r-card-art-w` so
   skeletons and the packer's card-height reference track the real cards. */
html[data-bp~="xs"] .r-v2-shell {
  --r-card-art-w: 130px;
}

/* Last row rests clear of the bottom tab bar (the rest of the scroll passes
   under its glass). A real in-flow spacer, not `padding-bottom`: Safari /
   older Chromium drop a scroll container's bottom padding from its
   scrollable overflow, trapping the last row behind the bar. */
html[data-bp~="sm-and-down"] .r-v2-shell__scroller::after {
  content: "";
  display: block;
  height: calc(var(--r-bottom-nav-h) + var(--r-safe-b) + 24px);
}
html[data-bp~="xs"] .r-v2-shell__header {
  padding-top: calc(var(--r-nav-h) + 16px);
}
html[data-bp~="xs"] .r-v2-shell__row {
  gap: 12px;
}
</style>
