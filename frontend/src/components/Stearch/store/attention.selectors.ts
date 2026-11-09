import { createSelector } from "./create-selector";
import { selectLoadedRoms, selectPositionedRoms } from "./results.selectors";
import type { StearchAction } from "./stearch.actions";
import {
  selectActiveId,
  selectEnteredId,
  selectIds,
  selectSelectedIds,
  selectVisiblePosition,
} from "./stearch.selectors";

/** The current game's position, loaded or not; `null` when none is current. */
export const selectCurrentPosition = createSelector(
  [selectActiveId, selectIds],
  (activeId, ids) => {
    const position = activeId === null ? -1 : ids.indexOf(activeId);
    return position === -1 ? null : position;
  },
);

/** Goes one level in, onto the current game. Nothing without one. */
export const selectEnterActions = createSelector(
  [selectActiveId],
  (activeId): readonly StearchAction[] =>
    activeId === null
      ? []
      : [{ type: "view/set", patch: { enteredId: activeId } }],
);

/** Goes back out to page level. */
export const LEAVE_ACTIONS: readonly StearchAction[] = [
  { type: "view/set", patch: { enteredId: null } },
];

/** The entered game's position; `null` at page level. */
export const selectEnteredPosition = createSelector(
  [selectEnteredId, selectIds],
  (enteredId, ids) => {
    const position = enteredId === null ? -1 : ids.indexOf(enteredId);
    return position === -1 ? null : position;
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
