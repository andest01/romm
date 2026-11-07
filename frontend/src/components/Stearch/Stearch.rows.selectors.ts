import { formatBytes } from "@/utils";
import type { StearchAction } from "./Stearch.actions";
import { createSelector } from "./Stearch.create-selector";
import { selectPositionedRoms, selectTotal } from "./Stearch.results.selectors";
import { selectSearchTerm, selectSelectedIds } from "./Stearch.selectors";
import type { StearchRom } from "./Stearch.state-props";

export interface TextPart {
  text: string;
  isMatch: boolean;
}

/** The API rom, plus only what has to be derived for display. */
export type ListRow = StearchRom & {
  /** Where this row sits among all results. */
  readonly position: number;
  readonly title: string;
  readonly titleParts: readonly TextPart[];
  readonly fileNameParts: readonly TextPart[];
  readonly coverUrl: string | null;
  readonly size: string;
  readonly added: string;
  readonly released: string;
  readonly year: string;
  readonly rating: string;
  readonly length: string;
  readonly languagesLabel: string;
  readonly regionsLabel: string;
  readonly isSelected: boolean;
  readonly pressActions: readonly StearchAction[];
  readonly hoverActions: readonly StearchAction[];
};

/** `null` is an item that exists but isn't loaded yet. */
export type ListSlot = ListRow | null;

const EMPTY_VALUE = "—";
const SECONDS_PER_HOUR = 3600;

function splitMatch(text: string, searchTerm: string): readonly TextPart[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [{ text, isMatch: false }];
  const lower = text.toLowerCase();
  const parts: TextPart[] = [];
  let from = 0;
  for (
    let at = lower.indexOf(term);
    at !== -1;
    at = lower.indexOf(term, from)
  ) {
    if (at > from) parts.push({ text: text.slice(from, at), isMatch: false });
    from = at + term.length;
    parts.push({ text: text.slice(at, from), isMatch: true });
  }
  if (from < text.length) {
    parts.push({ text: text.slice(from), isMatch: false });
  }
  return parts;
}

// Each demands only the fields it reads, so any rom-shaped object fits.
export const titleOf = <T extends Pick<StearchRom, "name" | "fs_name">>(
  item: T,
): string => item.name ?? item.fs_name;

export const coverUrlOf = <
  T extends Pick<StearchRom, "path_cover_small" | "url_cover">,
>(
  item: T,
): string | null => item.path_cover_small ?? item.url_cover;

// Dates repeat across a library, and a Date round trip per row showed in scroll profiles.
const releasedByTime = new Map<number, string>();

export const releasedOf = <T extends Pick<StearchRom, "metadatum">>({
  metadatum: { first_release_date },
}: T): string => {
  if (first_release_date === null) return EMPTY_VALUE;
  const known = releasedByTime.get(first_release_date);
  if (known !== undefined) return known;
  const released = new Date(first_release_date).toISOString().slice(0, 10);
  releasedByTime.set(first_release_date, released);
  return released;
};

export const ratingOf = <T extends Pick<StearchRom, "metadatum">>({
  metadatum: { average_rating },
}: T): string =>
  average_rating === null ? EMPTY_VALUE : `★ ${average_rating.toFixed(1)}`;

export const lengthOf = <T extends Pick<StearchRom, "hltb_metadata">>({
  hltb_metadata,
}: T): string => {
  const mainStory = hltb_metadata?.main_story;
  return mainStory === undefined
    ? EMPTY_VALUE
    : `${(mainStory / SECONDS_PER_HOUR).toFixed(1)} h`;
};

// Row data stays apart from selection and search, so neither rebuilds it.
const selectBaseRows = createSelector([selectPositionedRoms], (positioned) =>
  positioned.map(({ rom, position }) => {
    const released = releasedOf(rom);
    return {
      ...rom,
      position,
      title: titleOf(rom),
      coverUrl: coverUrlOf(rom),
      size: formatBytes(rom.fs_size_bytes),
      added: rom.created_at.slice(0, 10),
      released,
      year: released.slice(0, 4),
      rating: ratingOf(rom),
      length: lengthOf(rom),
      languagesLabel: rom.languages.join(", "),
      regionsLabel: rom.regions.join(", "),
      hoverActions: [
        { type: "attention/set", patch: { activeId: rom.id } },
      ] as const,
    };
  }),
);

export const selectRows = createSelector(
  [selectBaseRows, selectSelectedIds, selectSearchTerm],
  (rows, selectedIds, searchTerm): readonly ListRow[] => {
    const term = searchTerm ?? "";
    const selected = new Set(selectedIds);
    return rows.map((row) => {
      const isSelected = selected.has(row.id);
      return {
        ...row,
        titleParts: splitMatch(row.title, term),
        fileNameParts: splitMatch(row.fs_name, term),
        isSelected,
        pressActions: [
          {
            type: isSelected ? "selection/remove" : "selection/add",
            ids: [row.id],
          },
        ],
      };
    });
  },
);

/** One slot per result, in position; unloaded positions are `null`. */
export const selectSlots = createSelector(
  [selectRows, selectTotal],
  (rows, total): readonly ListSlot[] => {
    const slots: ListSlot[] = Array.from({ length: total }, () => null);
    for (const row of rows) slots[row.position] = row;
    return slots;
  },
);
