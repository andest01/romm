import { useEventListener } from "@vueuse/core";
import { computed, nextTick, readonly } from "vue";
import { useEscapable } from "@/composables/useEscapable";
import { closeTopOverlay } from "@/composables/useGamepad";
import { focusFromInput } from "@/utils/autofocus";
import {
  LEAVE_ACTIONS,
  selectEnterActions,
  selectEnteredPosition,
} from "../../../store/attention.selectors";
import {
  selectActiveId,
  selectEnteredId,
  selectIds,
  selectSelectedIds,
} from "../../../store/stearch.selectors";
import stearchStore from "../../../store/stearch.store";
import { enteredElement, hopWithin, ITEM_STOPS } from "../../waypoints.driver";
import { useResultsView } from "../results.view";
import { createAxisStore } from "./axis-store";
import { createListInput, type ListInputOptions } from "./list-input";
import { itemDomId } from "./list.selectors";
import { useKeyDriver } from "./use-key-driver";
import { useStickDriver } from "./use-stick-driver";

/** Connects a list to the input machine and its drivers. */
export function useKeyFocus(
  options: Omit<
    ListInputOptions,
    | "enter"
    | "isEntered"
    | "exit"
    | "hopItem"
    | "toggleSelected"
    | "idAt"
    | "openActions"
    | "closeOverlay"
  >,
) {
  const view = useResultsView();
  const store = stearchStore();
  const entered = (): HTMLElement | null =>
    enteredElement(selectEnteredPosition(store.state));
  const isEntered = computed(() => selectEnteredId(store.state) !== null);
  const enter = (): void => {
    store.dispatch(selectEnterActions(store.state));
    void nextTick(() =>
      focusFromInput(entered()?.querySelector<HTMLElement>(ITEM_STOPS)),
    );
  };
  const exit = (): void => store.dispatch(LEAVE_ACTIONS);
  const hopItem = (step: 1 | -1): void => {
    const root = entered();
    if (root) hopWithin(root, step);
  };
  useEscapable(isEntered, () => {
    const game = entered();
    exit();
    focusFromInput(game?.closest<HTMLElement>('[role="grid"]'));
  });
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
      enter,
      isEntered: () => isEntered.value,
      exit,
      hopItem,
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
