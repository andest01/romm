import { formatBytes } from "@/utils";
import type { StearchAction } from "./Stearch.actions";
import { createSelector } from "./Stearch.create-selector";
import type { StearchPanelLayout } from "./Stearch.layout-props";
import { INITIAL_QUERY } from "./Stearch.reducer";
import type { IStearchState, StearchRom } from "./Stearch.state-props";
import type { ListRow, ListSlot, TextPart } from "./content/list/list.props";

export const selectSearchTerm = (state: IStearchState) =>
  state.query.searchTerm;
export const selectSortKey = (state: IStearchState) => state.query.orderBy;
export const selectSortDir = (state: IStearchState) => state.query.orderDir;
export const selectOpenFieldId = (state: IStearchState) =>
  state.view.openFieldId;
export const selectViewMode = (state: IStearchState) => state.view.mode;
export const selectIsAdvancedOpen = (state: IStearchState) =>
  state.view.isAdvancedOpen;
export const selectVisiblePosition = (state: IStearchState) =>
  state.view.visiblePosition;
export const selectJump = (state: IStearchState) => state.view.jump;
export const selectStatus = (state: IStearchState) => state.results.status;
export const selectIds = (state: IStearchState) => state.results.ids;
export const selectCharIndex = (state: IStearchState) =>
  state.results.charIndex;
export const selectFilterValues = (state: IStearchState) =>
  state.results.filterValues;
export const selectWindows = (state: IStearchState) => state.results.windows;
export const selectActiveId = (state: IStearchState) =>
  state.attention.activeId;
export const selectSelectedIds = (state: IStearchState) =>
  state.attention.selectedIds;

/** Filters go; the search and sort stay. */
export const selectClearActions = createSelector(
  [selectSearchTerm, selectSortKey, selectSortDir],
  (searchTerm, orderBy, orderDir): readonly StearchAction[] => [
    {
      type: "query/set",
      patch: { ...INITIAL_QUERY, searchTerm, orderBy, orderDir },
    },
  ],
);

export const selectTotal = createSelector([selectIds], (ids) => ids.length);

/** Runs of results sharing a first letter. The rail and the band read these. */
export const selectSections = createSelector(
  [selectCharIndex, selectTotal],
  (charIndex, total) => {
    const starts = Object.entries(charIndex).sort(([, a], [, b]) => a - b);
    return starts.map(([key, start], index) => {
      const next = starts[index + 1];
      return { key, start, size: (next ? next[1] : total) - start };
    });
  },
);

const selectPositionedRoms = createSelector([selectWindows], (windows) =>
  Object.entries(windows)
    .map(([offset, roms]) => ({ offset: Number(offset), roms }))
    .sort((a, b) => a.offset - b.offset)
    .flatMap(({ offset, roms }) =>
      roms.map((rom, index) => ({ rom, position: offset + index })),
    ),
);

export const selectLoadedRoms = createSelector(
  [selectPositionedRoms],
  (positioned) => positioned.map(({ rom }) => rom),
);

export const selectIsLoading = createSelector(
  [selectStatus],
  (status) => status.kind === "idle" || status.kind === "loading",
);

export const selectErrorMessage = createSelector([selectStatus], (status) =>
  status.kind === "failed" ? status.message : null,
);

export const selectSelectedCount = createSelector(
  [selectSelectedIds],
  (ids) => ids.length,
);

export const selectPanelLayout = createSelector(
  [selectIsAdvancedOpen],
  (isPanelShown): StearchPanelLayout => ({
    isPanelShown,
    panelAxis: "inline",
    panelPosition: "start",
  }),
);

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

export const releasedOf = <T extends Pick<StearchRom, "metadatum">>({
  metadatum: { first_release_date },
}: T): string =>
  first_release_date === null
    ? EMPTY_VALUE
    : new Date(first_release_date).toISOString().slice(0, 10);

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

/** The active item, else the latest selection. The background follows it. */
const selectAttendedId = createSelector(
  [selectActiveId, selectSelectedIds],
  (activeId, selectedIds) => activeId ?? selectedIds.at(-1) ?? null,
);

export const selectBackgroundUrl = createSelector(
  [selectAttendedId, selectLoadedRoms],
  (id, roms) => {
    const rom = roms.find((candidate) => candidate.id === id);
    return rom ? coverUrlOf(rom) : null;
  },
);

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
      pressActions: [{ type: "selection/toggle", id: rom.id }] as const,
      hoverActions: [{ type: "attention/active", id: rom.id }] as const,
    };
  }),
);

export const selectRows = createSelector(
  [selectBaseRows, selectSelectedIds, selectSearchTerm],
  (rows, selectedIds, searchTerm): readonly ListRow[] => {
    const term = searchTerm ?? "";
    const selected = new Set(selectedIds);
    return rows.map((row) => ({
      ...row,
      titleParts: splitMatch(row.title, term),
      fileNameParts: splitMatch(row.fs_name, term),
      isSelected: selected.has(row.id),
    }));
  },
);

const PENDING_SLOT_COUNT = 24;

/** One slot per result, in position; unloaded positions are `null`. */
export const selectSlots = createSelector(
  [selectRows, selectTotal, selectIsLoading],
  (rows, total, isLoading): readonly ListSlot[] => {
    const count = total === 0 && isLoading ? PENDING_SLOT_COUNT : total;
    const slots: ListSlot[] = Array.from({ length: count }, () => null);
    for (const row of rows) slots[row.position] = row;
    return slots;
  },
);
