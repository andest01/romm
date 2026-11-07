export interface RailBucket {
  key: string;
  label: string;
  /** Its share of the rail's height, so the rail maps to the whole list. */
  share: number;
  isCurrent: boolean;
}

export interface RailProps {
  buckets: RailBucket[];
}

export interface RailEmits {
  /** A press or drag. Only the DOM knows where it landed. */
  scrub: [event: PointerEvent];
}
