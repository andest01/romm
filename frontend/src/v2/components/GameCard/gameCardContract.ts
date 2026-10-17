// What a gallery card is: the props it takes and the events it emits.
// GameCard and GameCardCompact both implement it, so a call site can swap one
// for the other.
//
// `GAME_CARD_FIELDS` is what a card paints *at rest*. The gallery can ask the
// API for just those (`fields=`), and GameCardCompact accepts such a row. The
// hover actions (download, collections, delete...) need a full ROM, which is
// why GameCard keeps `rom: SimpleRom` and the compact card defers its actions.
import type { Projected } from "@/services/api/fields";
import type { SimpleRom } from "@/stores/roms";
import { METADATA_PROVIDERS } from "@/v2/utils/metadataProviders";

/** The id fields behind the provider badges (`activeProviders` reads them). */
const PROVIDER_ID_KEYS = METADATA_PROVIDERS.map((p) => p.key);

/** Every ROM field a card or a table row reads to paint itself. Reading another one in GameCardCompact is a type error. */
export const GAME_CARD_FIELDS = [
  "name",
  "fs_name",
  "fs_name_no_ext",
  "platform_id",
  "platform_custom_name",
  "platform_display_name",
  "platform_slug",
  "platform_fs_slug",
  "is_identified",
  "rom_user",
  "regions",
  "languages",
  "sibling_roms",
  "path_cover_large",
  "path_cover_small",
  "url_cover",
  "path_video",
  "has_file_on_disk",
  "ss_metadata",
  "gamelist_metadata",
  "launchbox_metadata",
  "updated_at",
  "fs_size_bytes",
  "created_at",
  "hltb_metadata",
  "metadatum",
  ...PROVIDER_ID_KEYS,
] as const satisfies readonly (keyof SimpleRom)[];

/** A ROM carrying at least the fields a card paints. A full `SimpleRom` satisfies it. */
export type GameCardRom = Projected<
  SimpleRom,
  (typeof GAME_CARD_FIELDS)[number]
>;

export interface GameCardProps {
  rom: SimpleRom;
  to?: string | undefined;
  hero?: boolean;
  /** Card scale tier. Drives the cover art width/height via the shared
   *  `--r-card-art-w/h` tokens, and the hero variant's `--r-hero-w/h`
   *  when `hero` is true.
   *    xs (48 × 64)   - list-row avatars
   *    sm (120 × 162) - dense pickers
   *    md (158 × 213) - gallery default (no class, keeps the global token)
   *    lg (200 × 270) - edit-dialog preview
   *    xl (240 × 324) - detail page cover
   *  Hero scales linearly with size (it's just an aspect-ratio change,
   *  not a separate scale), so `hero` + any `size` paints the 16:9
   *  shape at that tier's footprint. */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  focused?: boolean;
  webp?: boolean;
  showPlatformIcon?: boolean;
  /** Passive mode: root is `<article role="button">` instead of a
   *  router-link; action overlay / rating / status / platform-icon /
   *  bg-art highlight are all suppressed. Click emits `@click` for the
   *  consumer to handle. Hover scale stays unless `noHover` is set. */
  static?: boolean;
  /** Fully decorative: root is a plain `<div>` with no role, no
   *  tabindex, no router wiring, no own click handlers. The whole
   *  card is visual content; the parent (typically an `<a>` or row
   *  button) owns interactivity and navigation. Avoids the nested-
   *  interactive HTML quirk when the card lives inside an anchor (eg.
   *  list-row avatars). Implies `static` semantics: no overlay /
   *  badges / bg highlight. */
  decorative?: boolean;
  /** Suppress the hover scale + shadow. Use for purely-decorative
   *  surfaces (edit-dialog cover preview) where the card isn't an
   *  affordance. Only meaningful in `static` mode. */
  noHover?: boolean;
  /** Toggle the label below the cover. Defaults true to match the
   *  gallery experience. */
  showTitle?: boolean;
  /** Override the resolved cover URL. Used for local preview blobs
   *  (edit dialog) and external provider URLs (match dialog source
   *  variants). Bypasses the path/webp/url_cover chain. */
  coverSrc?: string | null | undefined;
  /** When a `coverSrc` override is shown (e.g. the continue-playing
   *  screenshot), float a small 2D cover-art thumbnail in the bottom-right
   *  corner so the game stays identifiable. No-op without a `coverSrc`. */
  coverPip?: boolean;
  /** Paint a brand-coloured outline to mark the card as selected
   *  (cover-variant picker, multi-select gallery). When `selectable`
   *  is true this prop is ignored: the card subscribes directly to
   *  `gallerySelection` so a single source of truth (the store)
   *  drives every selected card across the gallery. Left unset, a static
   *  card gets no `aria-pressed`. */
  selected?: boolean | undefined;
  /** Opt the card into the gallery's multi-select store. When true:
   *  the card reads its selected state from `gallerySelection`,
   *  shows a checkbox affordance (on hover or whenever the gallery
   *  is in selection mode), and routes its clicks through the
   *  selection-input composable (shift = range, ctrl/cmd = toggle,
   *  long-press on touch = enter mode). Defaults false so non-
   *  gallery consumers (pickers, edit-dialog previews) keep their
   *  prop-driven behaviour. */
  selectable?: boolean;
  /** Sparse position of the rom inside the gallery: the anchor that
   *  shift-range selection uses. Provided by `GalleryShell`. Required
   *  when `selectable` is true (the composable needs a position to
   *  store/restore the range anchor). */
  position?: number | undefined;
}

export interface GameCardEmits {
  (e: "click", event: MouseEvent): void;
  /** The cover's natural aspect ratio once its image loads. */
  (e: "ratio", payload: { romId: number; ratio: number }): void;
}

/** GameCardCompact takes everything GameCard takes, and a ROM with only the painted fields. */
export type GameCardCompactProps = Omit<GameCardProps, "rom"> & {
  rom: GameCardRom;
};
