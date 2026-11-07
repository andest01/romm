import { createSelector } from "./Stearch.create-selector";
import { selectLoadedRoms } from "./Stearch.results.selectors";
import { coverUrlOf } from "./Stearch.rows.selectors";
import { selectActiveId, selectSelectedIds } from "./Stearch.selectors";

export const selectSelectedCount = createSelector(
  [selectSelectedIds],
  (ids) => ids.length,
);

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
