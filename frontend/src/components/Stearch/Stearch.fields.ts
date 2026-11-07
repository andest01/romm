import type { StearchLabelKey } from "./Stearch.labels";
import type {
  LogicKeyFor,
  MultiKey,
  StearchFilterValues,
  TriStateKey,
} from "./Stearch.state-props";

type ValuesKey = Exclude<keyof StearchFilterValues, "platforms" | "game_modes">;

type MultiField = {
  [K in MultiKey]: {
    kind: "multi";
    id: string;
    key: K;
    logicKey: LogicKeyFor<K>;
    labelKey: StearchLabelKey;
    valuesFrom: ValuesKey;
  };
}[MultiKey];

/** One definition per thing a search can ask. */
export type FieldCoreConcept =
  | MultiField
  | {
      kind: "tri-state";
      id: string;
      key: TriStateKey;
      labelKey: StearchLabelKey;
    }
  | {
      kind: "range";
      id: string;
      minKey: "hltbMainStoryMin";
      maxKey: "hltbMainStoryMax";
      labelKey: StearchLabelKey;
    }
  | {
      kind: "platform";
      id: string;
      key: "platformIds";
      labelKey: StearchLabelKey;
    };

const multi = <K extends MultiKey>(
  key: K,
  logicKey: LogicKeyFor<K>,
  labelKey: StearchLabelKey,
  valuesFrom: ValuesKey,
) => ({ kind: "multi", id: key, key, logicKey, labelKey, valuesFrom }) as const;

const triState = (key: TriStateKey, labelKey: StearchLabelKey) =>
  ({ kind: "tri-state", id: key, key, labelKey }) as const;

export const STEARCH_FIELDS: readonly FieldCoreConcept[] = [
  {
    kind: "platform",
    id: "platformIds",
    key: "platformIds",
    labelKey: "common.platforms",
  },
  {
    kind: "range",
    id: "hltbMainStory",
    minKey: "hltbMainStoryMin",
    maxKey: "hltbMainStoryMax",
    labelKey: "rom.how-long-to-beat",
  },
  multi("selectedGenres", "genresLogic", "rom.genres", "genres"),
  multi(
    "selectedFranchises",
    "franchisesLogic",
    "rom.franchises",
    "franchises",
  ),
  multi(
    "selectedCollections",
    "collectionsLogic",
    "rom.collections",
    "collections",
  ),
  multi("selectedCompanies", "companiesLogic", "rom.companies", "companies"),
  multi(
    "selectedPublishers",
    "publishersLogic",
    "rom.publishers",
    "publishers",
  ),
  multi(
    "selectedDevelopers",
    "developersLogic",
    "rom.developers",
    "developers",
  ),
  multi(
    "selectedAgeRatings",
    "ageRatingsLogic",
    "rom.age-ratings",
    "age_ratings",
  ),
  multi("selectedRegions", "regionsLogic", "rom.regions", "regions"),
  multi("selectedLanguages", "languagesLogic", "rom.languages", "languages"),
  multi(
    "selectedPlayerCounts",
    "playerCountsLogic",
    "rom.player-count",
    "player_counts",
  ),
  multi("selectedTags", "tagsLogic", "platform.tags", "tags"),
  triState("filterMatched", "platform.show-matched"),
  triState("filterFavorites", "platform.show-favorites"),
  triState("filterDuplicates", "platform.show-duplicates"),
  triState("filterPlayables", "platform.show-playables"),
  triState("filterRA", "platform.show-ra"),
  triState("filterSaves", "platform.has-saves"),
  triState("filterStates", "platform.has-states"),
  triState("filterSoundtrack", "platform.has-soundtrack"),
  triState("filterMissing", "platform.show-missing"),
  triState("filterPhysical", "platform.show-physical"),
  triState("filterVerified", "platform.show-verified"),
];
