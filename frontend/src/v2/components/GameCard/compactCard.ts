// Geometry and pure helpers for GameCardCompact.
//
// The card is landscape, with one constant size: a 2:3 cover thumbnail on the
// left and the text on the right, the thumbnail exactly as tall as the text
// block. A grid therefore knows every row's height before a single cover
// loads. The numbers live here; the card's CSS reads them as custom
// properties, which the grid (or a story) applies once on its root with
// `compactCardVars()`. Nothing is computed per card.
import { toWebpUrl } from "@/v2/composables/useWebpSupport";
import type { GameCardRom } from "./gameCardContract";

export const COMPACT_LABEL_LINES = 2;
export const COMPACT_LABEL_LINE_PX = 15;
/** Space between the title and the info line. */
export const COMPACT_TEXT_GAP_PX = 4;
export const COMPACT_META_LINE_PX = 14;

/** The text block: the title's lines, a gap, the info line. */
export const COMPACT_TEXT_H_PX =
  COMPACT_LABEL_LINES * COMPACT_LABEL_LINE_PX +
  COMPACT_TEXT_GAP_PX +
  COMPACT_META_LINE_PX;

/** The thumbnail is as tall as the text block, in the 2:3 cover shape. */
export const COMPACT_ART_H_PX = COMPACT_TEXT_H_PX;
export const COMPACT_ART_W_PX = Math.round((COMPACT_ART_H_PX * 2) / 3);
/** Space between the thumbnail and the text. */
export const COMPACT_COLUMN_GAP_PX = 8;

export const COMPACT_CARD_W_PX = 144;
export const COMPACT_CARD_H_PX = COMPACT_ART_H_PX;
/** Vertical space between rows of cards. */
export const COMPACT_ROW_GAP_PX = 12;
/** Horizontal space between cards in a row. */
export const COMPACT_GAP_PX = 12;

/** Height one row of cards takes in the scroller, card plus the gap below. */
export const COMPACT_ROW_H_PX = COMPACT_CARD_H_PX + COMPACT_ROW_GAP_PX;

/** The CSS custom properties the card reads; apply once on the grid root. */
export function compactCardVars(): Record<string, string> {
  return {
    "--r-compact-w": `${COMPACT_CARD_W_PX}px`,
    "--r-compact-h": `${COMPACT_CARD_H_PX}px`,
    "--r-compact-art-w": `${COMPACT_ART_W_PX}px`,
    "--r-compact-column-gap": `${COMPACT_COLUMN_GAP_PX}px`,
    "--r-compact-row-h": `${COMPACT_ROW_H_PX}px`,
    "--r-compact-label-lines": String(COMPACT_LABEL_LINES),
    "--r-compact-label-line": `${COMPACT_LABEL_LINE_PX}px`,
    "--r-compact-text-gap": `${COMPACT_TEXT_GAP_PX}px`,
    "--r-compact-meta-line": `${COMPACT_META_LINE_PX}px`,
  };
}

/** The card's cover: the small file (the thumbnail is 32 px wide), then the large, then the provider URL. */
export function compactCoverUrl(
  rom: Pick<GameCardRom, "path_cover_small" | "path_cover_large" | "url_cover">,
  webp: boolean,
): string | null {
  const local = rom.path_cover_small || rom.path_cover_large;
  if (local) return toWebpUrl(local, webp);
  return rom.url_cover || null;
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

// The app's locale ids look like "en_US"; Intl wants BCP 47 ("en-US") and throws on the former.
function dateFormat(locale: string | undefined): Intl.DateTimeFormat {
  const tag = locale?.replace("_", "-");
  const key = tag ?? "";
  let format = dateFormats.get(key);
  if (!format) {
    try {
      format = new Intl.DateTimeFormat(tag, {
        year: "numeric",
        month: "short",
      });
    } catch {
      format = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
      });
    }
    dateFormats.set(key, format);
  }
  return format;
}

/** "Oct 2026" in `locale`, or "" when the timestamp is missing or unparseable. */
export function formatCardDate(
  timestamp: string | number | null | undefined,
  locale: string | undefined,
): string {
  if (timestamp == null || timestamp === "") return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormat(locale).format(date);
}
