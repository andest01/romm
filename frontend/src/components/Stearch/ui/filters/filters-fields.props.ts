import type { StearchAction } from "../../store/stearch.actions";

export type ChoiceState = "off" | "on" | "excluded";

/** One thing a user can pick, ready to show on any surface. */
export interface ChoicePreview {
  id: string;
  label: string;
  /** Present once the backend gives live counts. */
  count: number | null;
  state: ChoiceState;
  actions: readonly StearchAction[];
}

export interface LogicPreview {
  id: string;
  label: string;
  isActive: boolean;
  actions: readonly StearchAction[];
}

/** A span in hours; `null` is an open end. */
export interface FieldRange {
  readonly min: number | null;
  readonly max: number | null;
}

interface FieldBase {
  id: string;
  label: string;
  /** The field in words, such as "Genres: all of Action, RPG". `null` is unset. */
  summary: string | null;
  clearActions: readonly StearchAction[];
}

export interface MultiFieldPreview extends FieldBase {
  kind: "multi";
  choices: readonly ChoicePreview[];
  logic: readonly LogicPreview[];
  openActions: readonly StearchAction[];
}

export interface TriStateFieldPreview extends FieldBase {
  kind: "tri-state";
  choice: ChoicePreview;
}

export interface RangeFieldPreview extends FieldBase {
  kind: "range";
  range: FieldRange;
}

export interface PlatformFieldPreview extends FieldBase {
  kind: "platform";
}

/** One field, ready to show on any surface. */
export type FieldPreview =
  | MultiFieldPreview
  | TriStateFieldPreview
  | RangeFieldPreview
  | PlatformFieldPreview;

export type RangeBound = "min" | "max";

/** The slider's top stop. At the ends a bound is open, so it's `null`. */
export const RANGE_MAX_HOURS = 100;

export interface RangeChange {
  bound: RangeBound;
  /** In hours, on the slider's 0 to `RANGE_MAX_HOURS` scale. */
  value: number;
}
