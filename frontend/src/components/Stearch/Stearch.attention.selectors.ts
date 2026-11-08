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

/** The current game's position, or `null` when none is current or loaded. */
export const selectCurrentPosition = createSelector(
  [selectActiveId, selectPositionedRoms],
  (activeId, positioned) => {
    const found = positioned.find(({ rom }) => rom.id === activeId);
    return found ? found.position : null;
  },
);

/** Where any view should open: the current game, else the latest selected
 *  game, else where the list already was. Only loaded games count. */
export const selectAnchorPosition = createSelector(
  [
    selectCurrentPosition,
    selectSelectedIds,
    selectPositionedRoms,
    selectVisiblePosition,
  ],
  (currentPosition, selectedIds, positioned, visiblePosition) => {
    if (currentPosition !== null) return currentPosition;
    const latest = selectedIds.at(-1);
    const selected = positioned.find(({ rom }) => rom.id === latest);
    return selected ? selected.position : visiblePosition;
  },
);

/** The current game: `activeId` joined to the loaded games. `null` when none
 *  is current, or the current one isn't loaded. */
export const selectCurrentGame = createSelector(
  [selectActiveId, selectLoadedRoms],
  (id, roms) => roms.find((rom) => rom.id === id) ?? null,
);

/** The selected games that are loaded, in selection order. */
export const selectSelectedGames = createSelector(
  [selectSelectedIds, selectLoadedRoms],
  (ids, roms) => roms.filter((rom) => ids.includes(rom.id)),
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
