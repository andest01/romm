import type { RTableColumn } from "@/lib";
import type { StearchSortDir, StearchSortKey } from "../../Stearch.state-props";
import type { ItemPart } from "../list/item.props";
import type { ListProps, ScrollRow } from "../list/list.props";
import type { RowProps } from "./row/row.props";

export interface TableProps {
  /** The view for each row. */
  item: ItemPart<RowProps>;
  verbs: RowProps["verbs"];
  setScroller: ListProps["setScroller"];
  band: ListProps["band"];
  bandOffset: ListProps["bandOffset"];
  rail: ListProps["rail"];
  scrollbarWidth: ListProps["scrollbarWidth"];
  tableLabel: string;
  columns: readonly RTableColumn[];
  gridTemplate: string;
  rowHeight: number;
  headHeight: number;
  /** Headings and one-slot rows. Only visible rows reach the DOM. */
  rows: readonly ScrollRow[];
  sortKey: StearchSortKey;
  sortDir: StearchSortDir;
  errorMessage: string | null;
  emptyMessage: string;
}
