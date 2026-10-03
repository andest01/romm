import { RSkeletonBlock } from "@v2/lib";
import {
  type Component,
  computed,
  defineAsyncComponent,
  defineComponent,
  type FunctionalComponent,
  h,
  ref,
} from "vue";
import MarkdownLoadError from "./MarkdownLoadError.vue";

// Vue passes the wrapped component's attrs to the loading and error components; drop them.
function withoutAttrs(view: FunctionalComponent): FunctionalComponent {
  view.inheritAttrs = false;
  return view;
}

/** Lazy md-editor component: a skeleton when the chunk is slow to arrive and a
 *  retry when it fails to load. */
export function lazyMarkdown(
  loader: () => Promise<{ default: Component }>,
  skeletonHeight: string,
) {
  const loading = withoutAttrs(() =>
    h(RSkeletonBlock, { height: skeletonHeight }),
  );
  return defineComponent({
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const attempt = ref(0);
      const failed = withoutAttrs(() =>
        h(MarkdownLoadError, { onRetry: () => attempt.value++ }),
      );
      // A fresh async component per attempt, since a failed one stays failed.
      const inner = computed(() => {
        void attempt.value;
        return defineAsyncComponent({
          loader,
          loadingComponent: loading,
          errorComponent: failed,
        });
      });
      return () => h(inner.value, attrs, slots);
    },
  });
}

export const loadMdPreview = () => import("./markdownPreview");

// md-editor stays out of the importing chunk until the first render.
export const AsyncMdPreview = lazyMarkdown(loadMdPreview, "4rem");

export const AsyncMdEditor = lazyMarkdown(
  () => import("./markdownEditor"),
  "12rem",
);
