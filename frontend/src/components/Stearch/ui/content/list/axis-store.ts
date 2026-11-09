import { shallowRef } from "vue";
import {
  AXIS_AT_REST,
  type AxisEffect,
  type AxisEvent,
  transition,
} from "./axis-machine";

/** Holds one axis's state. Drivers `dispatch` events and carry out effects. */
export function createAxisStore() {
  const state = shallowRef(AXIS_AT_REST);
  const listeners: ((effect: AxisEffect) => void)[] = [];
  return {
    state,
    dispatch(event: AxisEvent): void {
      const result = transition(state.value, event);
      state.value = result.state;
      for (const effect of result.effects) {
        for (const listener of listeners) listener(effect);
      }
    },
    onEffect(listener: (effect: AxisEffect) => void): void {
      listeners.push(listener);
    },
  };
}

export type AxisStore = ReturnType<typeof createAxisStore>;
