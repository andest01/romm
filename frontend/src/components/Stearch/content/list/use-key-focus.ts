import { readonly } from "vue";
import { useContentView } from "../content.view";
import { createAxisStore } from "./axis-store";
import { createListInput, type ListInputOptions } from "./list-input";
import { useKeyDriver } from "./use-key-driver";
import { useStickDriver } from "./use-stick-driver";

/** Connects a list to the input machine and its drivers. */
export function useKeyFocus(options: ListInputOptions) {
  const view = useContentView();
  const input = createListInput(options, createAxisStore(), view);
  useStickDriver(input.stick, "pad");
  useKeyDriver(input.keys);
  return {
    activePosition: readonly(view.activePosition),
    activeDescendant: input.activeDescendant,
    noteRange: input.noteRange,
    onKey: input.onKey,
  };
}
