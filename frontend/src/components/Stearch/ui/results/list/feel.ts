import { computed, inject, provide, type InjectionKey, type Ref } from "vue";
import { type ScrollFeel, TABLE_FEEL, TILES_FEEL } from "./list.props";

/** Each view's feel. The app uses the constants; a story provides its own, so
 *  the real tiles and table can be tuned with controls. */
export interface Feels {
  tiles: ScrollFeel;
  table: ScrollFeel;
}

const FEELS: InjectionKey<Readonly<Ref<Feels>>> = Symbol("stearch-feels");
const DEFAULT_FEELS = computed((): Feels => ({
  tiles: TILES_FEEL,
  table: TABLE_FEEL,
}));

/** For a story: the feels every list below it uses. */
export function provideFeels(feels: Readonly<Ref<Feels>>): void {
  provide(FEELS, feels);
}

/** One view's feel, from a story if it provided one, else the constant. */
export function useFeel(view: keyof Feels): Readonly<Ref<ScrollFeel>> {
  const feels = inject(FEELS, DEFAULT_FEELS);
  return computed(() => feels.value[view]);
}
