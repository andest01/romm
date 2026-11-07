import GalleryRow from "./gallery-row/gallery-row.container.vue";
import type { ItemPart } from "./item.props";
import type { ListItemKind } from "./list.props";
import PhoneCoverPure from "./phone-cover/phone-cover.pure-component.vue";
import PhoneRowPure from "./phone-row/phone-row.pure-component.vue";
import TilePure from "./tile/tile.pure-component.vue";

/** Which view each item kind uses. Swapping one is one line here. */
export const LIST_ITEMS = {
  tile: TilePure,
  "phone-row": PhoneRowPure,
  "phone-cover": PhoneCoverPure,
  "gallery-row": GalleryRow,
} as const satisfies Readonly<Record<ListItemKind, ItemPart>>;
