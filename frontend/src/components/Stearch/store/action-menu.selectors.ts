import { createSelector } from "./create-selector";
import type { StearchAction } from "./stearch.actions";
import { selectCollections, selectSelectedIds } from "./stearch.selectors";

export type ActionVerb =
  | {
      readonly kind: "add-to-collection";
      readonly collectionId: number;
      readonly romIds: readonly number[];
    }
  | { readonly kind: "dispatch"; readonly actions: readonly StearchAction[] };

export interface ActionEntry {
  readonly id: string;
  readonly label: string;
  readonly verb: ActionVerb;
}

export interface BulkMenu {
  /** Names the entry that opens this menu, and the menu itself. */
  readonly title: string;
  readonly entries: readonly ActionEntry[];
}

/** The bulk verbs for the selection; `null` when nothing is selected. */
export const selectBulkMenu = createSelector(
  [selectSelectedIds, selectCollections],
  (ids, collections): BulkMenu | null => {
    if (ids.length === 0) return null;
    // Stub words: move to locale keys before this leaves the fork.
    const noun = `${ids.length} ${ids.length === 1 ? "game" : "games"}`;
    return {
      title: `Bulk actions for ${noun}`,
      entries: [
        ...collections.map(({ id, name }): ActionEntry => ({
          id: `collection:${id}`,
          label: `Add ${noun} to ${name}`,
          verb: { kind: "add-to-collection", collectionId: id, romIds: ids },
        })),
        {
          id: "deselect",
          label: `Deselect ${noun}`,
          verb: {
            kind: "dispatch",
            actions: [{ type: "selection/remove", ids }],
          },
        },
      ],
    };
  },
);
