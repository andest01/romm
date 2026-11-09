import { useEventListener } from "@vueuse/core";
import { readonly } from "vue";
import { useRouter } from "vue-router";
import { closeTopOverlay } from "@/composables/useGamepad";
import { ROUTES } from "@/plugins/routeNames";
import {
  selectActiveId,
  selectIds,
  selectSelectedIds,
} from "../../../store/stearch.selectors";
import stearchStore from "../../../store/stearch.store";
import { useContentView } from "../content.view";
import { createAxisStore } from "./axis-store";
import { createListInput, type ListInputOptions } from "./list-input";
import { itemDomId } from "./list.selectors";
import { useKeyDriver } from "./use-key-driver";
import { useStickDriver } from "./use-stick-driver";

/** Connects a list to the input machine and its drivers. */
export function useKeyFocus(
  options: Omit<
    ListInputOptions,
    "open" | "toggleSelected" | "idAt" | "openActions" | "closeOverlay"
  >,
) {
  const view = useContentView();
  const store = stearchStore();
  const router = useRouter();
  const open = (): void => {
    const rom = selectActiveId(store.state);
    if (rom !== null) void router.push({ name: ROUTES.ROM, params: { rom } });
  };
  const toggleSelected: ListInputOptions["toggleSelected"] = () => {
    const id = selectActiveId(store.state);
    if (id === null) return null;
    const mode = selectSelectedIds(store.state).includes(id) ? "remove" : "add";
    store.dispatch([
      {
        type: mode === "add" ? "selection/add" : "selection/remove",
        ids: [id],
      },
    ]);
    return mode;
  };
  const idAt: ListInputOptions["idAt"] = (position) =>
    selectIds(store.state)[position] ?? null;
  // The real menu, on the game the cursor is on: one list of verbs everywhere.
  const openActions = (): void => {
    const position = view.activePosition.value;
    if (position === null) return;
    document
      .getElementById(itemDomId(position))
      ?.querySelector<HTMLElement>(".r-game-btn--action-more")
      ?.click();
  };
  const input = createListInput(
    {
      ...options,
      open,
      toggleSelected,
      idAt,
      openActions,
      closeOverlay: closeTopOverlay,
    },
    createAxisStore(),
    view,
  );
  useStickDriver(input.stick, "pad");
  useKeyDriver(input.keys);
  useEventListener(window, "gamepad:buttondown", (event) =>
    input.onPadButton(event.detail.name ?? ""),
  );
  useEventListener(window, "gamepad:buttonup", (event) =>
    input.onPadButtonUp(event.detail.name ?? ""),
  );
  return {
    activePosition: readonly(view.activePosition),
    activeDescendant: input.activeDescendant,
    noteRange: input.noteRange,
    onKey: input.onKey,
  };
}
