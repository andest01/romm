import { readonly } from "vue";
import { useRouter } from "vue-router";
import { ROUTES } from "@/plugins/routeNames";
import { selectActiveId } from "../../../store/stearch.selectors";
import stearchStore from "../../../store/stearch.store";
import { useContentView } from "../content.view";
import { createAxisStore } from "./axis-store";
import { createListInput, type ListInputOptions } from "./list-input";
import { useKeyDriver } from "./use-key-driver";
import { useStickDriver } from "./use-stick-driver";

/** Connects a list to the input machine and its drivers. */
export function useKeyFocus(options: Omit<ListInputOptions, "open">) {
  const view = useContentView();
  const store = stearchStore();
  const router = useRouter();
  const open = (): void => {
    const rom = selectActiveId(store.state);
    if (rom !== null) void router.push({ name: ROUTES.ROM, params: { rom } });
  };
  const input = createListInput({ ...options, open }, createAxisStore(), view);
  useStickDriver(input.stick, "pad");
  useKeyDriver(input.keys);
  return {
    activePosition: readonly(view.activePosition),
    activeDescendant: input.activeDescendant,
    noteRange: input.noteRange,
    onKey: input.onKey,
  };
}
