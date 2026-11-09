import type { StearchAction } from "../../store/stearch.actions";

export interface RailBucket {
  key: string;
  label: string;
  /** Its share of the rail's height, so the rail maps to the whole list. */
  share: number;
  isCurrent: boolean;
  /** A press: go to the bucket's first game. */
  navigateActions: readonly StearchAction[];
}

/** The visible part of the list, as fractions of the rail's height, 0 to 1. */
export interface RailThumb {
  start: number;
  size: number;
}

export interface RailProps {
  buckets: RailBucket[];
  thumb: RailThumb;
  label: string;
}

export interface RailEmits {
  /** A pointer down or drag. Only the DOM knows where it landed. */
  scrub: [event: PointerEvent];
  press: [actions: readonly StearchAction[]];
  key: [event: KeyboardEvent];
}
