import { useMediaQuery } from "@vueuse/core";
import {
  computed,
  inject,
  provide,
  shallowRef,
  type ComputedRef,
  type InjectionKey,
  type ShallowRef,
} from "vue";
import { useBreakpoint } from "@/composables/useBreakpoint";
import type { CruiseStack } from "./list/axis-machine";

/** Which item family suits the device: phones get phone items. */
export type StearchDevice = "phone" | "wide";

/** Facts about the screen, not the job, so they stay out of the store. */
export interface ContentView {
  /** Derived and read-only. */
  device: ComputedRef<StearchDevice>;
  /** Where arrow keys have put the ring, by position, so it can sit on a
   *  ghost. Written only by `useKeyFocus` in the one view that is mounted;
   *  living here, it survives a switch between tiles and table. */
  activePosition: ShallowRef<number | null>;
  /** True while the rail is being dragged, so windows load only where the
   *  drag stops. Written only by the rail container. */
  isScrubbing: ShallowRef<boolean>;
  /** The stick's score multiplier; `null` outside cruise. Written only by
   *  `useKeyFocus`. */
  cruiseStack: ShallowRef<CruiseStack | null>;
  /** Sends a position to the mounted view's machine. Written by that view. */
  navigate: ShallowRef<((position: number) => void) | null>;
}

const CONTENT_VIEW: InjectionKey<ContentView> = Symbol("stearch-content-view");

function createContentView(): ContentView {
  const { xs, smAndDown } = useBreakpoint();
  const isCoarsePointer = useMediaQuery("(pointer: coarse)");
  return {
    // A phone is narrow, or a touch screen held sideways.
    device: computed(() =>
      xs.value || (smAndDown.value && isCoarsePointer.value) ? "phone" : "wide",
    ),
    activePosition: shallowRef(null),
    isScrubbing: shallowRef(false),
    cruiseStack: shallowRef(null),
    navigate: shallowRef(null),
  };
}

/** For `content.container.vue`, which shares one view with its parts. */
export function provideContentView(): ContentView {
  const view = createContentView();
  provide(CONTENT_VIEW, view);
  return view;
}

/** For a part of the content. On its own, as in a story, it makes its own. */
export function useContentView(): ContentView {
  return inject(CONTENT_VIEW, createContentView, true);
}
