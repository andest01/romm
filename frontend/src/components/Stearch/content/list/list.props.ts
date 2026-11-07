import type { StearchAction } from "../../Stearch.actions";
import type { StearchRom } from "../../Stearch.state-props";
import type { ScrollerRef } from "../use-scroller-jump";
import type { ItemPart, ItemProps } from "./item.props";

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
