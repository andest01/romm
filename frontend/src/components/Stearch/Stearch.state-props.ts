import type { ReadonlyDeep } from "type-fest";
import type { CustomLimitOffsetPage_SimpleRomSchema_ as GetRomsResponse } from "@/__generated__/models/CustomLimitOffsetPage_SimpleRomSchema_";
import type { SimpleRomSchema } from "@/__generated__/models/SimpleRomSchema";
import type { GetRomsParams } from "@/services/api/rom";
import type { GalleryOrderKey } from "@/stores/galleryRoms";
import type { StearchLabels } from "./Stearch.labels";

export type StearchViewMode = "tiles" | "table" | "swarm";

/** The gallery's order keys own the names; this picks the ones we offer. */
export const STEARCH_SORT_KEYS = [
  "name",
  "fs_size_bytes",
  "created_at",
  "first_release_date",
  "average_rating",
] as const satisfies readonly GalleryOrderKey[];
export type StearchSortKey = (typeof STEARCH_SORT_KEYS)[number];
export type StearchSortDir = "asc" | "desc";

/** The params a search can set; paging and scoping stay out of the UI model. */
type SearchParams = Omit<
  GetRomsParams,
  | "limit"
  | "offset"
  | "signal"
  | "withCharIndex"
  | "withFilterValues"
  | "withRomIdIndex"
  | "withTotal"
  | "collectionId"
  | "virtualCollectionId"
  | "smartCollectionId"
  | "groupByMetaId"
  | "releasedDays"
  | "releasedBeforeYear"
>;

/** The search object: the API's own params, so calling it needs no mapping. */
export type StearchQuery = Readonly<
  Omit<
    Required<SearchParams>,
    "orderBy" | "orderDir" | MultiKey | "platformIds"
  > &
    Record<MultiKey, string[]> & {
      orderBy: StearchSortKey;
      orderDir: StearchSortDir;
      platformIds: number[];
    }
>;

export type TriStateKey = Extract<keyof SearchParams, `filter${string}`>;
export type MultiKey = Extract<keyof SearchParams, `selected${string}`>;
export type LogicKeyFor<K extends MultiKey> = K extends `selected${infer Name}`
  ? `${Uncapitalize<Name>}Logic`
  : never;

/** The full API rom, so any existing view can take one. */
export type StearchRom = Readonly<SimpleRomSchema>;

/** The fields we read, which the seam validates. The rest pass through. */
export type StearchCheckedRom = ReadonlyDeep<
  Pick<
    SimpleRomSchema,
    | "id"
    | "name"
    | "fs_name"
    | "platform_display_name"
    | "fs_size_bytes"
    | "created_at"
    | "regions"
    | "languages"
    | "path_cover_small"
    | "url_cover"
  > & {
    metadatum: Pick<
      SimpleRomSchema["metadatum"],
      "first_release_date" | "average_rating"
    >;
    hltb_metadata: Pick<
      NonNullable<SimpleRomSchema["hltb_metadata"]>,
      "main_story"
    > | null;
  }
>;

export type StearchFilterValues = ReadonlyDeep<
  GetRomsResponse["filter_values"]
>;

export type StearchPage = ReadonlyDeep<
  Pick<GetRomsResponse, "total" | "char_index" | "rom_id_index">
> & {
  readonly items: readonly StearchRom[];
  readonly filter_values: StearchFilterValues;
};

/** One request id covers a query and all of its windows. */
export type RequestStatusCoreConcept =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly requestId: number }
  | { readonly kind: "ready"; readonly requestId: number }
  | { readonly kind: "failed"; readonly message: string };

/** What the user is attending to, whatever the surface. */
export interface AttentionCoreConcept {
  /** The one item under hover or focus. */
  readonly activeId: number | null;
  /** Many items, most recent last, so it reads as a stack. */
  readonly selectedIds: readonly number[];
}

/** The UI model. It describes the job, not the screen. */
export interface IStearchState {
  readonly query: StearchQuery;
  readonly view: {
    readonly mode: StearchViewMode;
    readonly isAdvancedOpen: boolean;
    /** The result at the top of the list. */
    readonly visiblePosition: number;
    /** The latest request to scroll. Each one is a new object. */
    readonly jump: {
      readonly position: number;
      readonly isSmooth: boolean;
    } | null;
    /** How far the next heading has pushed the section band up. */
    readonly bandOffset: number;
    /** The field open in the add-a-filter menu. */
    readonly openFieldId: string | null;
  };
  /** Words are state, so selectors can hand views finished content. */
  readonly labels: StearchLabels;
  readonly results: {
    readonly status: RequestStatusCoreConcept;
    /** Every result in order, so the total is `ids.length`. */
    readonly ids: readonly number[];
    readonly charIndex: Readonly<Record<string, number>>;
    readonly filterValues: StearchFilterValues;
    /** Pages of roms by offset. One load replaces one entry. */
    readonly windows: Readonly<Record<number, readonly StearchRom[]>>;
  };
  readonly attention: AttentionCoreConcept;
}
