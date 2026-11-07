import { useElementSize, usePreferredReducedMotion } from "@vueuse/core";
import { computed, nextTick, readonly, shallowRef, watch } from "vue";
import { selectJump } from "../../Stearch.selectors";
import stearchStore from "../../Stearch.store";
import type { JumpScroller, ScrollerRef, ScrollRow } from "./list.props";
import { bandOffsetFor, headTopsOf, rowForPosition } from "./list.selectors";

const isJumpScroller = (instance: object): instance is JumpScroller =>
  "scrollToIndex" in instance;

/** The scroller's DOM side: it carries out jumps from state, opens on the
 *  anchor, and reports its box and the band's push, read-only. It never
 *  dispatches. */
export function useScrollerJump(
  rows: () => readonly ScrollRow[],
  rowHeight: () => number,
  headHeight: () => number,
  anchor: () => number,
) {
  const store = stearchStore();
  // Changes on every scroll frame, so it stays a view fact with this one owner.
  const bandOffset = shallowRef(0);
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
      bandOffset.value = bandOffsetFor(headTops.value, scrollTop, headHeight());
    },
  );

  // The content box excludes padding, so items fit the space they really get.
  const { width, height } = useElementSize(
    () => scroller.value?.containerEl ?? null,
  );
  const box = computed((): Pick<DOMRectReadOnly, "width" | "height"> => ({
    width: width.value,
    height: height.value,
  }));

  // A view that mounts opens on the anchor from state, so switching views
  // keeps the same item in frame instead of starting at the top.
  const setScroller = (instance: ScrollerRef) => {
    const next = instance && isJumpScroller(instance) ? instance : null;
    const isFirstMount = scroller.value === null && next !== null;
    scroller.value = next;
    if (!isFirstMount) return;
    void nextTick(() => {
      next.scrollToIndex(rowForPosition(rows(), anchor()), { smooth: false });
    });
  };

  // Browsers draw scrollbars at different widths, so measure it: the rail
  // sits hard against its left edge. Re-measured whenever the box changes.
  const scrollbarWidth = computed(() => {
    const element = scroller.value?.containerEl;
    return box.value.width >= 0 && element
      ? element.offsetWidth - element.clientWidth
      : 0;
  });

  return { setScroller, box, scrollbarWidth, bandOffset: readonly(bandOffset) };
}
