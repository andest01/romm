import type { StearchAction } from "./Stearch.actions";
import { buildLabels } from "./Stearch.labels";
import type { IStearchState, StearchQuery } from "./Stearch.state-props";

export const INITIAL_QUERY: StearchQuery = {
  searchTerm: null,
  orderBy: "name",
  orderDir: "asc",
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
    visiblePosition: 0,
    jump: null,
    bandOffset: 0,
    openFieldId: null,
  },
  labels: buildLabels((key) => key),
  results: {
    status: { kind: "idle" },
    ids: [],
    charIndex: {},
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

const toggled = <T>(list: readonly T[], value: T): T[] =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];

export function stearchReducer(
  state: IStearchState,
  action: StearchAction,
): IStearchState {
  const { query, view, results, attention } = state;
  switch (action.type) {
    case "query/set":
      return { ...state, query: { ...query, ...action.patch } };
    case "query/toggle":
      return {
        ...state,
        query: {
          ...query,
          [action.key]: toggled(query[action.key], action.value),
        },
      };
    case "view/visible":
      return { ...state, view: { ...view, visiblePosition: action.position } };
    case "view/jump":
      return {
        ...state,
        view: {
          ...view,
          jump: { position: action.position, isSmooth: action.isSmooth },
        },
      };
    case "view/band":
      return { ...state, view: { ...view, bandOffset: action.offset } };
    case "view/set":
      return { ...state, view: { ...view, mode: action.mode } };
    case "advanced/toggle":
      return {
        ...state,
        view: { ...view, isAdvancedOpen: !view.isAdvancedOpen },
      };
    case "field/open":
      return { ...state, view: { ...view, openFieldId: action.id } };
    case "locale/set":
      return { ...state, labels: action.labels };
    case "attention/active":
      return { ...state, attention: { ...attention, activeId: action.id } };
    case "selection/toggle":
      return {
        ...state,
        attention: {
          ...attention,
          selectedIds: toggled(attention.selectedIds, action.id),
        },
      };
    case "selection/all":
      return {
        ...state,
        attention: { ...attention, selectedIds: results.ids },
      };
    case "selection/section": {
      const ids = results.ids.slice(action.start, action.start + action.size);
      const selected = new Set(attention.selectedIds);
      const isAllSelected = ids.every((id) => selected.has(id));
      ids.forEach((id) =>
        isAllSelected ? selected.delete(id) : selected.add(id),
      );
      return {
        ...state,
        attention: { ...attention, selectedIds: [...selected] },
      };
    }
    case "selection/clear":
      return { ...state, attention: { ...attention, selectedIds: [] } };
    // A request for an effect; it changes no state by itself.
    case "window/wanted":
      return state;
    case "window/requested":
      return {
        ...state,
        results: {
          ...results,
          status: { kind: "loading", requestId: action.requestId },
        },
      };
    case "window/loaded": {
      if (!isCurrentRequest(state, action.requestId)) return state;
      const { page, offset, requestId } = action;
      return {
        ...state,
        results:
          offset === 0
            ? {
                status: { kind: "ready", requestId },
                ids: page.rom_id_index,
                charIndex: page.char_index,
                filterValues: page.filter_values,
                windows: { 0: page.items },
              }
            : {
                ...results,
                status: { kind: "ready", requestId },
                windows: { ...results.windows, [offset]: page.items },
              },
      };
    }
    case "window/failed":
      if (!isCurrentRequest(state, action.requestId)) return state;
      return {
        ...state,
        results: {
          ...results,
          status: { kind: "failed", message: action.message },
        },
      };
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
}
