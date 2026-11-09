import { buildLabels } from "./labels";
import {
  reducerOf,
  type Handlers,
  type StearchAction,
} from "./stearch.actions";
import type { IStearchState, StearchQuery } from "./stearch.state-props";

export const INITIAL_QUERY: StearchQuery = {
  searchTerm: null,
  sort: [{ param: "name", dir: "asc" }],
  groupByMetaId: false,
  platformIds: [],
  filterMatched: null,
  filterFavorites: null,
  filterDuplicates: null,
  filterPlayables: null,
  filterRA: null,
  filterSaves: null,
  filterStates: null,
  filterSoundtrack: null,
  filterMissing: null,
  filterPhysical: null,
  filterVerified: null,
  selectedGenres: [],
  selectedFranchises: [],
  selectedCollections: [],
  selectedCompanies: [],
  selectedPublishers: [],
  selectedDevelopers: [],
  selectedAgeRatings: [],
  selectedRegions: [],
  selectedLanguages: [],
  selectedPlayerCounts: [],
  selectedMetadataProviders: [],
  selectedTags: [],
  selectedStatuses: [],
  hltbMainStoryMin: null,
  hltbMainStoryMax: null,
  genresLogic: "any",
  franchisesLogic: "any",
  collectionsLogic: "any",
  companiesLogic: "any",
  publishersLogic: "any",
  developersLogic: "any",
  ageRatingsLogic: "any",
  regionsLogic: "any",
  languagesLogic: "any",
  statusesLogic: "any",
  playerCountsLogic: "any",
  metadataProvidersLogic: "any",
  tagsLogic: "any",
};

export const INITIAL_STEARCH_STATE: IStearchState = {
  query: INITIAL_QUERY,
  view: {
    mode: "tiles",
    isAdvancedOpen: true,
    visibleSpan: { first: 0, last: 0 },
    jump: null,
    openFieldId: null,
  },
  labels: buildLabels((key) => key),
  results: {
    status: { kind: "idle" },
    ids: [],
    bucketIndex: {},
    filterValues: {
      genres: [],
      franchises: [],
      collections: [],
      companies: [],
      publishers: [],
      developers: [],
      game_modes: [],
      age_ratings: [],
      player_counts: [],
      regions: [],
      languages: [],
      tags: [],
      platforms: [],
    },
    windows: {},
  },
  attention: { activeId: null, selectedIds: [] },
};

const isCurrentRequest = ({ results }: IStearchState, requestId: number) =>
  (results.status.kind === "loading" || results.status.kind === "ready") &&
  results.status.requestId === requestId;

/** Appends what's missing, in order; adding twice changes nothing. */
const added = <T>(list: readonly T[], values: readonly T[]): T[] => [
  ...list,
  ...values.filter((value) => !list.includes(value)),
];

const removed = <T>(list: readonly T[], values: readonly T[]): T[] =>
  list.filter((item) => !values.includes(item));

/** One handler per action type. Each gets its own action, already narrowed. */
const HANDLERS: Handlers<IStearchState, StearchAction> = {
  "query/set": (state, { patch }) => ({
    ...state,
    query: { ...state.query, ...patch },
  }),
  "query/add": (state, { key, value }) => ({
    ...state,
    query: { ...state.query, [key]: added(state.query[key], [value]) },
  }),
  "query/remove": (state, { key, value }) => ({
    ...state,
    query: { ...state.query, [key]: removed(state.query[key], [value]) },
  }),
  "view/set": (state, { patch }) => ({
    ...state,
    view: { ...state.view, ...patch },
  }),
  "locale/set": (state, { labels }) => ({ ...state, labels }),
  "attention/set": (state, { patch }) => ({
    ...state,
    attention: { ...state.attention, ...patch },
  }),
  "selection/add": (state, { ids }) => ({
    ...state,
    attention: {
      ...state.attention,
      selectedIds: added(state.attention.selectedIds, ids),
    },
  }),
  "selection/remove": (state, { ids }) => ({
    ...state,
    attention: {
      ...state.attention,
      selectedIds: removed(state.attention.selectedIds, ids),
    },
  }),
  // A request for an effect; it changes no state by itself.
  "window/wanted": (state) => state,
  // A new search starts at the top, so nothing from the old list carries over.
  "window/requested": (state, { requestId }) => {
    const loading = {
      ...state,
      results: { ...state.results, status: { kind: "loading", requestId } },
    } satisfies IStearchState;
    return HANDLERS["view/set"](loading, {
      type: "view/set",
      patch: {
        visibleSpan: { first: 0, last: 0 },
        jump: { position: 0, isSmooth: false },
      },
    });
  },
  "window/loaded": (state, { requestId, offset, page }) => {
    if (!isCurrentRequest(state, requestId)) return state;
    return {
      ...state,
      results:
        offset === 0
          ? {
              status: { kind: "ready", requestId },
              ids: page.rom_id_index,
              bucketIndex: page.char_index,
              filterValues: page.filter_values,
              windows: { 0: page.items },
            }
          : {
              ...state.results,
              status: { kind: "ready", requestId },
              windows: { ...state.results.windows, [offset]: page.items },
            },
    };
  },
  "window/failed": (state, { requestId, message }) => {
    if (!isCurrentRequest(state, requestId)) return state;
    return {
      ...state,
      results: { ...state.results, status: { kind: "failed", message } },
    };
  },
};

export const stearchReducer: (
  state: IStearchState,
  action: StearchAction,
) => IStearchState = reducerOf(HANDLERS);
