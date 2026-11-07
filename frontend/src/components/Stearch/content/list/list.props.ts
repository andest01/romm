import type { ComponentPublicInstance } from "vue";
import type { ListSlot } from "../../Stearch.rows.selectors";
import type { ItemPart, ItemProps } from "./item.props";

/** The scroller methods a jump needs. */
export interface JumpScroller {
  scrollTop: number;
  scrollToIndex(index: number, options: { smooth: boolean }): void;
}

/** What Vue hands a function `ref`. */
export type ScrollerRef = Element | ComponentPublicInstance | null;

export type ListItemKind = "tile" | "phone-row" | "phone-cover" | "gallery-row";

/** One line of the scroller. `position` is the first result at or after it. */
export type ScrollRow =
  | {
      readonly kind: "head";
      readonly key: string;
      readonly position: number;
      readonly label: string;
    }
  | {
      readonly kind: "items";
      readonly key: string;
      readonly position: number;
      readonly slots: readonly ListSlot[];
    };

/** The visible span, in scroller rows. `last` is exclusive. */
export interface VisibleRange {
  first: number;
  last: number;
}

export interface ListProps {
  /** The view for each slot. */
  item: ItemPart;
  verbs: ItemProps["verbs"];
  setScroller: (scroller: ScrollerRef) => void;
  columns: number;
  rowHeight: number;
  headHeight: number;
  /** Headings and item rows. Only visible rows reach the DOM. */
  rows: readonly ScrollRow[];
  errorMessage: string | null;
  emptyMessage: string;
}
