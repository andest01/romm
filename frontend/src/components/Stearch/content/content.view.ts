import { useMediaQuery } from "@vueuse/core";
import {
  computed,
  inject,
  provide,
  type ComputedRef,
  type InjectionKey,
} from "vue";
import { useBreakpoint } from "@/composables/useBreakpoint";

/** Which item family suits the device: phones get phone items. */
export type StearchDevice = "phone" | "wide";

/** Facts about the screen, not the job, so they stay out of the store. Every
 *  fact here is derived and read-only: nothing writes to the view. */
export interface ContentView {
  device: ComputedRef<StearchDevice>;
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
