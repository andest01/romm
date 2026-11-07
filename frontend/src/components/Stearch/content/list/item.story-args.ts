import type { ArgTypes } from "storybook/internal/types";
import { fn } from "storybook/test";
import { h } from "vue";
import {
  LOADED_STEARCH_STATE,
  STEARCH_ROM,
  STEARCH_ROW,
} from "../../Stearch.fixtures";
import { selectRows } from "../../Stearch.rows.selectors";
import type { ListSlot } from "../../Stearch.rows.selectors";
import type { ItemProps } from "./item.props";

const REGIONS = ["USA", "Japan", "Europe"];
const LANGUAGES = ["en", "ja", "fr", "de"];

/** Stands in for the connected verbs, so stories need no stores. */
export const ITEM_VERBS: ItemProps["verbs"] = () => h("span", "♡ ⋯");

/** Controls for what every item shows, fed through the real selectors. */
export interface ItemStoryArgs {
  isPlaceholder: boolean;
  isSelected: boolean;
  hasCover: boolean;
  searchTerm: string;
  name: string;
  fs_name: string;
  platform_display_name: string;
  fs_size_bytes: number;
  created_at: number;
  first_release_date: number;
  average_rating: number;
  main_story_hours: number;
  regions: string[];
  languages: string[];
  onPress: () => void;
}

export const ITEM_ARG_TYPES: Partial<ArgTypes<ItemStoryArgs>> = {
  isPlaceholder: { control: "boolean" },
  isSelected: { control: "boolean" },
  hasCover: { control: "boolean" },
  searchTerm: { control: "text" },
  name: { control: "text" },
  fs_name: { control: "text" },
  platform_display_name: { control: "text" },
  fs_size_bytes: {
    control: { type: "range", min: 0, max: 8_000_000_000, step: 1_000_000 },
  },
  created_at: { control: "date" },
  first_release_date: { control: "date" },
  average_rating: { control: { type: "range", min: 0, max: 5, step: 0.1 } },
  main_story_hours: { control: { type: "range", min: 0, max: 200, step: 0.5 } },
  regions: { control: "inline-check", options: REGIONS },
  languages: { control: "inline-check", options: LANGUAGES },
  onPress: { control: false },
};

export const ITEM_ARGS: ItemStoryArgs = {
  isPlaceholder: false,
  isSelected: false,
  hasCover: true,
  searchTerm: "",
  name: "Chrono Trigger",
  fs_name: "Chrono Trigger (USA).sfc",
  platform_display_name: "SNES",
  fs_size_bytes: 4_194_304,
  created_at: Date.UTC(2026, 0, 2),
  first_release_date: Date.UTC(1995, 2, 11),
  average_rating: 4.8,
  main_story_hours: 24.5,
  regions: ["USA"],
  languages: ["en"],
  onPress: fn(),
};

/** Builds one rom from the controls and returns what the app would render. */
export function itemFromArgs(args: ItemStoryArgs): ListSlot {
  if (args.isPlaceholder) return null;
  const { query, attention, results } = LOADED_STEARCH_STATE;
  const base = STEARCH_ROM;
  const [row] = selectRows({
    ...LOADED_STEARCH_STATE,
    query: { ...query, searchTerm: args.searchTerm },
    attention: {
      ...attention,
      selectedIds: args.isSelected ? [base.id] : [],
    },
    results: {
      ...results,
      windows: {
        0: [
          {
            ...base,
            name: args.name,
            fs_name: args.fs_name,
            platform_display_name: args.platform_display_name,
            fs_size_bytes: args.fs_size_bytes,
            created_at: new Date(args.created_at).toISOString(),
            regions: args.regions,
            languages: args.languages,
            url_cover: args.hasCover ? base.url_cover : null,
            metadatum: {
              ...base.metadatum,
              first_release_date: args.first_release_date,
              average_rating: args.average_rating,
            },
            hltb_metadata: { main_story: args.main_story_hours * 3600 },
          },
        ],
      },
    },
  });
  if (!row) throw new Error("The item story built no row");
  return row;
}

export const ITEM_PRESS_ACTIONS = STEARCH_ROW.pressActions;
