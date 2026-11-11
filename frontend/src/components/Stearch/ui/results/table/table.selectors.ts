import type { RTableSortPayload } from "@/lib";
import type { StearchAction } from "../../../store/stearch.actions";
import { STEARCH_SORT_KEYS } from "../../../store/stearch.state-props";

export const TABLE_ROW_HEIGHT = 30;
export const TABLE_HEAD_HEIGHT = 30;

/** A header click carries a value only the DOM knows, so it's built here. */
export function buildSortActions({
  key,
  dir,
}: RTableSortPayload): readonly StearchAction[] {
  const sortKey = STEARCH_SORT_KEYS.find((candidate) => candidate === key);
  if (!sortKey) return [];
  return [{ type: "query/set", patch: { sort: [{ param: sortKey, dir }] } }];
}
