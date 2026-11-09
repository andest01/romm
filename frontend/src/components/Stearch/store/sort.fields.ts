import type { StearchSortDir, StearchSortKey } from "./stearch.state-props";

/** What a bucket means, so each surface can draw it its own way. */
export type RailValue =
  | { kind: "text"; text: string }
  | { kind: "stars"; stars: number }
  | { kind: "year"; year: number };

interface SortField {
  readonly label: string;
  readonly directions: Readonly<Record<StearchSortDir, string>>;
  readonly defaultDir: StearchSortDir;
  readonly valueOf: (key: string) => RailValue;
}

const asText = (key: string): RailValue => ({ kind: "text", text: key });

const numberOr =
  (make: (value: number) => RailValue) =>
  (key: string): RailValue => {
    const value = Number(key);
    return Number.isFinite(value) ? make(value) : asText(key);
  };

const ALPHABETICAL = { asc: "A to Z", desc: "Z to A" } as const;
const BY_DATE = { asc: "Oldest first", desc: "Newest first" } as const;

// Stub labels: move to locale keys before this leaves the fork.
export const SORT_FIELDS: Readonly<Record<StearchSortKey, SortField>> = {
  name: {
    label: "Name",
    directions: ALPHABETICAL,
    defaultDir: "asc",
    valueOf: asText,
  },
  platform_id: {
    label: "Platform",
    directions: ALPHABETICAL,
    defaultDir: "asc",
    valueOf: asText,
  },
  fs_size_bytes: {
    label: "Size",
    directions: { asc: "Smallest first", desc: "Largest first" },
    defaultDir: "desc",
    valueOf: asText,
  },
  created_at: {
    label: "Added",
    directions: BY_DATE,
    defaultDir: "desc",
    valueOf: asText,
  },
  first_release_date: {
    label: "Released",
    directions: BY_DATE,
    defaultDir: "desc",
    valueOf: numberOr((year) => ({ kind: "year", year })),
  },
  average_rating: {
    label: "Rating",
    directions: { asc: "Lowest first", desc: "Highest first" },
    defaultDir: "desc",
    valueOf: numberOr((stars) => ({ kind: "stars", stars })),
  },
  hltb_main_story: {
    label: "Length",
    directions: { asc: "Shortest first", desc: "Longest first" },
    defaultDir: "asc",
    valueOf: asText,
  },
};

/** A bucket squeezed to fit the rail's narrow column. */
export function railTextOf(value: RailValue): string {
  if (value.kind === "stars") return String(value.stars);
  if (value.kind === "year") return `'${String(value.year).slice(-2)}`;
  return value.text.slice(0, 3);
}

/** A bucket as heading text. */
export function shortOf(value: RailValue): string {
  if (value.kind === "stars") return `★ ${value.stars}+`;
  if (value.kind === "year") return String(value.year);
  return value.text;
}

/** A bucket in words, for screen readers and titles. */
export function spokenOf(value: RailValue): string {
  if (value.kind === "stars") return `${value.stars} stars and up`;
  if (value.kind === "year") return String(value.year);
  return value.text;
}
