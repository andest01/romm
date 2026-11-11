import { INITIAL_QUERY } from "./stearch.reducer";
import {
  type LogicKeyFor,
  type MultiKey,
  STEARCH_SORT_KEYS,
  type StearchQuery,
  type StearchSortKey,
  type TriStateKey,
} from "./stearch.state-props";

type LogicKey = LogicKeyFor<MultiKey>;

/** One table, read both ways, so saving and loading can't drift. */
const TRI_STATES: readonly (readonly [TriStateKey, string])[] = [
  ["filterMatched", "matched"],
  ["filterFavorites", "favorite"],
  ["filterDuplicates", "duplicate"],
  ["filterPlayables", "playable"],
  ["filterRA", "has_ra"],
  ["filterSaves", "has_saves"],
  ["filterStates", "has_states"],
  ["filterSoundtrack", "has_soundtrack"],
  ["filterMissing", "missing"],
  ["filterPhysical", "physical"],
  ["filterVerified", "verified"],
];

const MULTIS: readonly (readonly [MultiKey, LogicKey, string, string])[] = [
  ["selectedGenres", "genresLogic", "genres", "genres_logic"],
  ["selectedFranchises", "franchisesLogic", "franchises", "franchises_logic"],
  [
    "selectedCollections",
    "collectionsLogic",
    "collections",
    "collections_logic",
  ],
  ["selectedCompanies", "companiesLogic", "companies", "companies_logic"],
  ["selectedPublishers", "publishersLogic", "publishers", "publishers_logic"],
  ["selectedDevelopers", "developersLogic", "developers", "developers_logic"],
  ["selectedAgeRatings", "ageRatingsLogic", "age_ratings", "age_ratings_logic"],
  ["selectedRegions", "regionsLogic", "regions", "regions_logic"],
  ["selectedLanguages", "languagesLogic", "languages", "languages_logic"],
  [
    "selectedPlayerCounts",
    "playerCountsLogic",
    "player_counts",
    "player_counts_logic",
  ],
  [
    "selectedMetadataProviders",
    "metadataProvidersLogic",
    "metadata_providers",
    "metadata_providers_logic",
  ],
  ["selectedTags", "tagsLogic", "tags", "tags_logic"],
  ["selectedStatuses", "statusesLogic", "selected_status", "statuses_logic"],
];

const LOGICS = ["any", "all", "none"];

/** The query as `filter_criteria`. The backend already reads `order_by` here. */
export function queryToCriteria(query: StearchQuery): Record<string, unknown> {
  const [{ param, dir }] = query.sort;
  const out: Record<string, unknown> = { order_by: param, order_dir: dir };
  if (query.searchTerm) out["search_term"] = query.searchTerm;
  if (query.platformIds.length > 0) out["platform_ids"] = query.platformIds;
  if (query.groupByMetaId) out["group_by_meta_id"] = true;
  if (query.hltbMainStoryMin !== null) {
    out["hltb_main_story_min"] = query.hltbMainStoryMin;
  }
  if (query.hltbMainStoryMax !== null) {
    out["hltb_main_story_max"] = query.hltbMainStoryMax;
  }
  for (const [key, stored] of TRI_STATES) {
    if (query[key] !== null) out[stored] = query[key];
  }
  for (const [key, logicKey, stored, storedLogic] of MULTIS) {
    if (query[key].length === 0) continue;
    out[stored] = query[key];
    out[storedLogic] = query[logicKey];
  }
  return out;
}

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number");
const isSortKey = (value: unknown): value is StearchSortKey =>
  STEARCH_SORT_KEYS.some((key) => key === value);

export interface LoadedSearch {
  /** A whole query: a load replaces the search, it doesn't merge. */
  readonly query: StearchQuery;
  /** Stored keys this version doesn't understand, shown and not applied. */
  readonly dropped: readonly string[];
}

/** Reads a stored search cautiously: it may be old, or from another client. */
export function criteriaToQuery(
  criteria: Readonly<Record<string, unknown>>,
): LoadedSearch {
  const dropped: string[] = [];
  const seen = new Set<string>();
  const read = (key: string): unknown => {
    seen.add(key);
    return criteria[key];
  };
  const reject = (key: string): void => {
    dropped.push(key);
  };

  const tri: Partial<Record<TriStateKey, boolean>> = {};
  for (const [key, stored] of TRI_STATES) {
    const value = read(stored);
    if (typeof value === "boolean") tri[key] = value;
    else if (value !== undefined && value !== null) reject(stored);
  }

  const multi: Partial<Record<MultiKey, string[]>> = {};
  const logic: Partial<Record<LogicKey, string>> = {};
  for (const [key, logicKey, stored, storedLogic] of MULTIS) {
    const values = read(stored);
    const operator = read(storedLogic);
    if (isStrings(values)) multi[key] = values;
    else if (values !== undefined && values !== null) reject(stored);
    if (typeof operator === "string" && LOGICS.includes(operator)) {
      logic[logicKey] = operator;
    } else if (operator !== undefined && operator !== null) {
      reject(storedLogic);
    }
  }

  const term = read("search_term");
  if (term !== undefined && term !== null && typeof term !== "string") {
    reject("search_term");
  }
  const platforms = read("platform_ids");
  if (platforms !== undefined && platforms !== null && !isNumbers(platforms)) {
    reject("platform_ids");
  }
  const orderBy = read("order_by");
  if (orderBy !== undefined && !isSortKey(orderBy)) reject("order_by");
  const orderDir = read("order_dir");
  const dir = orderDir === "desc" ? "desc" : "asc";
  const numberAt = (key: string): number | null => {
    const value = read(key);
    if (typeof value === "number") return value;
    if (value !== undefined && value !== null) reject(key);
    return null;
  };
  const hltbMainStoryMin = numberAt("hltb_main_story_min");
  const hltbMainStoryMax = numberAt("hltb_main_story_max");

  for (const key of Object.keys(criteria)) {
    if (!seen.has(key) && key !== "group_by_meta_id") reject(key);
  }

  return {
    dropped,
    query: {
      ...INITIAL_QUERY,
      ...tri,
      ...multi,
      ...logic,
      searchTerm: typeof term === "string" ? term : null,
      platformIds: isNumbers(platforms) ? platforms : [],
      groupByMetaId: criteria["group_by_meta_id"] === true,
      hltbMainStoryMin,
      hltbMainStoryMax,
      sort: isSortKey(orderBy) ? [{ param: orderBy, dir }] : INITIAL_QUERY.sort,
    },
  };
}
