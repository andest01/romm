import { usePreferredReducedMotion } from "@vueuse/core";
import { computed, shallowRef, watch, type ComponentPublicInstance } from "vue";
import { selectJump } from "../Stearch.selectors";
import stearchStore from "../Stearch.store";
import type { ScrollRow } from "./list/list.props";
import {
  bandOffsetFor,
  headTopsOf,
  rowForPosition,
} from "./list/list.selectors";

export interface JumpScroller {
  scrollTop: number;
  scrollToIndex(index: number, options: { smooth: boolean }): void;
}

/** What Vue hands a function `ref`. */
export type ScrollerRef = Element | ComponentPublicInstance | null;

const isJumpScroller = (instance: object): instance is JumpScroller =>
  "scrollToIndex" in instance;

/** Scrolling is DOM-only, so jumps run here and pixels become the band's push. */
export function useScrollerJump(
  rows: () => readonly ScrollRow[],
  rowHeight: () => number,
  headHeight: () => number,
) {
  const store = stearchStore();
  const motion = usePreferredReducedMotion();
  const scroller = shallowRef<JumpScroller | null>(null);
  const headTops = computed(() =>
    headTopsOf(rows(), rowHeight(), headHeight()),
  );

  watch(
    () => selectJump(store.state),
    (jump) => {
      if (!jump) return;
      scroller.value?.scrollToIndex(rowForPosition(rows(), jump.position), {
        smooth: jump.isSmooth && motion.value !== "reduce",
      });
    },
  );

  watch(
    () => scroller.value?.scrollTop ?? 0,
    (scrollTop) => {
      const offset = bandOffsetFor(headTops.value, scrollTop, headHeight());
      if (offset === store.state.view.bandOffset) return;
      store.dispatch([{ type: "view/set", patch: { bandOffset: offset } }]);
    },
  );

  return (instance: ScrollerRef) => {
    scroller.value = instance && isJumpScroller(instance) ? instance : null;
  };
}
