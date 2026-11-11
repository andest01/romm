import type { RailValue } from "../../../store/sort.fields";

export interface RailBucket {
  key: string;
  label: string;
  value: RailValue;
  /** Its share of the rail's height, so the rail maps to the whole list. */
  share: number;
  isCurrent: boolean;
  /** Where the bucket's first game sits: a press navigates here. */
  position: number;
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
  press: [position: number];
  key: [event: KeyboardEvent];
}
