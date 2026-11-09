import type { StearchSortKey } from "../../../store/stearch.state-props";
import type { RailValue } from "./rail.props";

const numberOr = (
  key: string,
  make: (value: number) => RailValue,
): RailValue => {
  const value = Number(key);
  return Number.isFinite(value) ? make(value) : { kind: "text", text: key };
};

/** What each sort field's bucket means, for the rail's HUD. A new visual is
 *  one entry here and one case in `rail-value`. */
const RAIL_VALUES: Record<StearchSortKey, (key: string) => RailValue> = {
  name: (key) => ({ kind: "text", text: key }),
  fs_size_bytes: (key) => ({ kind: "text", text: key }),
  created_at: (key) => ({ kind: "text", text: key }),
  first_release_date: (key) =>
    numberOr(key, (year) => ({ kind: "year", year })),
  average_rating: (key) => numberOr(key, (stars) => ({ kind: "stars", stars })),
};

export const railValueOf = (param: StearchSortKey, key: string): RailValue =>
  RAIL_VALUES[param](key);
