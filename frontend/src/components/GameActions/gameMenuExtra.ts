import type { ComputedRef, InjectionKey } from "vue";

/** Lets a view with a selection aim the menu's verbs at all of it. A label
 *  of `null` leaves that verb on the menu's own game. */
export interface GameMenuBulk {
  favoriteLabel: ComputedRef<string | null>;
  downloadLabel: ComputedRef<string | null>;
  favorite: () => Promise<void>;
  download: () => Promise<void>;
}

export const GAME_MENU_BULK: InjectionKey<GameMenuBulk> =
  Symbol("gameMenuBulk");
