import { useElementSize, usePreferredReducedMotion } from "@vueuse/core";
import { computed, nextTick, readonly, shallowRef, watch } from "vue";
import { focusFromInput } from "@/utils/autofocus";
import { isEditable } from "@/utils/editable";
import { selectJump } from "../../store/stearch.selectors";
import stearchStore from "../../store/stearch.store";
import type {
  JumpScroller,
  ScrollerRef,
  ScrollFeel,
  ScrollRow,
} from "./list.props";
import {
  bandOffsetFor,
  followScrollTop,
  headTopsOf,
  itemRowIndexOf,
  rowForPosition,
  rowTopOf,
} from "./list.selectors";
import { useGlide } from "./use-glide";

const isJumpScroller = (instance: object): instance is JumpScroller =>
  "scrollToIndex" in instance;

// A view that opens takes keyboard focus, so arrows work straight after the
// Tiles/Table switch instead of steering the switch. Typing is never
// interrupted.
function takeFocus(inside: HTMLElement | null): void {
  const grid = inside?.closest('[role="grid"]');
  if (!(grid instanceof HTMLElement)) return;
  if (isEditable(document.activeElement)) return;
  focusFromInput(grid, { preventScroll: true });
}

/** The scroller's DOM side: it carries out jumps from state, opens on the
 *  anchor, and reports its box and the band's push, read-only. It never
 *  dispatches. */
export function useScrollerJump(
  rows: () => readonly ScrollRow[],
  rowHeight: () => number,
  headHeight: () => number,
  anchor: () => number,
  feel: () => ScrollFeel,
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

  // A view that mounts opens with the anchor in the centre band, as keys
  // would leave it, so switching views keeps the same game centred. It waits
  // for a measured width: before that, tiles lay out at one column and the
  // anchor's row would be far too low.
  let isOpening = false;
  const openOnAnchor = (): void => {
    const element = scroller.value;
    if (!isOpening || !element || box.value.width === 0) return;
    isOpening = false;
    takeFocus(element.containerEl);
    const index = itemRowIndexOf(rows(), anchor());
    if (index === -1) {
      element.scrollToIndex(rowForPosition(rows(), anchor()), {
        smooth: false,
      });
      return;
    }
    follow(index, 0);
  };
  watch(
    () => box.value.width,
    () => void nextTick(openOnAnchor),
  );

  const setScroller = (instance: ScrollerRef) => {
    const next = instance && isJumpScroller(instance) ? instance : null;
    const isFirstMount = scroller.value === null && next !== null;
    scroller.value = next;
    if (!isFirstMount) return;
    isOpening = true;
    void nextTick(openOnAnchor);
  };

  // Browsers draw scrollbars at different widths, so measure it: the rail
  // sits hard against its left edge. Re-measured whenever the box changes.
  const scrollbarWidth = computed(() => {
    const element = scroller.value?.containerEl;
    return box.value.width >= 0 && element
      ? element.offsetWidth - element.clientWidth
      : 0;
  });

  // Keeps a row inside the centre band (spec 007 F6), moving as the feel
  // says: a straight-line glide, or a jump cut when it's 0 or the user
  // prefers reduced motion. Measured from where a glide is heading, so quick
  // taps keep tracking.
  const glide = useGlide();
  const follow = (rowIndex: number, glideMs = feel().glideMs): void => {
    const element = scroller.value?.containerEl;
    if (!element) return;
    const target = followScrollTop(
      {
        top: rowTopOf(rows(), rowIndex, rowHeight(), headHeight()),
        height: rowHeight(),
      },
      {
        scrollTop: glide.heading(element),
        height: element.clientHeight,
        contentHeight: element.scrollHeight,
      },
      feel().bandRows * rowHeight(),
    );
    glide.to(element, target, motion.value === "reduce" ? 0 : glideMs);
  };

  return {
    setScroller,
    box,
    scrollbarWidth,
    bandOffset: readonly(bandOffset),
    follow,
    /** The scrolling element, for cruise to drive. */
    scrollerElement: (): HTMLElement | null =>
      scroller.value ? scroller.value.containerEl : null,
  };
}
