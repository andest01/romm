import { createSelector } from "./Stearch.create-selector";
import {
  selectLoadedRoms,
  selectPositionedRoms,
} from "./Stearch.results.selectors";
import { coverUrlOf } from "./Stearch.rows.selectors";
import {
  selectActiveId,
  selectSelectedIds,
  selectVisiblePosition,
} from "./Stearch.selectors";

/** Where any view should open: the active item if it's loaded, else the
 *  top of the list. Switching views keeps the same anchor in frame. */
export const selectAnchorPosition = createSelector(
  [selectActiveId, selectPositionedRoms, selectVisiblePosition],
  (activeId, positioned, visiblePosition) =>
    positioned.find(({ rom }) => rom.id === activeId)?.position ??
    visiblePosition,
);

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
