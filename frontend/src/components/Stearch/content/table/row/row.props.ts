import type { ItemProps } from "../../list/item.props";

export interface RowProps extends ItemProps {
  /** The table's column widths, shared with its header. */
  gridTemplate: string;
  /** How many skeleton cells a `null` row draws. */
  cellCount: number;
}
