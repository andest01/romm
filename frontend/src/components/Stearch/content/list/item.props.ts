import type { Component } from "vue";
import type { StearchAction } from "../../Stearch.actions";
import type { ListRow, ListSlot } from "./list.props";

/** What a game can do, the same in every view. */
export interface VerbsProps {
  rom: ListRow;
  /** Only the menu, for views too small for more (v4 5.5). */
  isCompact: boolean;
}

/** The one contract every view of an item shares: a slot in, actions out. */
export interface ItemProps {
  row: ListSlot;
  verbs: Component<VerbsProps>;
}

export interface ItemEmits {
  press: [actions: readonly StearchAction[]];
}

/** Any view of an item. A view may ask for more, never less. */
export type ItemPart<P extends ItemProps = ItemProps> = Component<P>;
