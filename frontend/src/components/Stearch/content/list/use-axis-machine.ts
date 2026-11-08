import { shallowRef } from "vue";
import {
  AXIS_AT_REST,
  type AxisEffect,
  type AxisEvent,
  transition,
} from "./axis-machine";

/** Holds one axis's state. Adapters `dispatch` events and carry out effects. */
export function useAxisMachine() {
  const state = shallowRef(AXIS_AT_REST);
  const listeners: ((effect: AxisEffect) => void)[] = [];

  function dispatch(event: AxisEvent): void {
    const result = transition(state.value, event);
    state.value = result.state;
    for (const effect of result.effects) {
      for (const listener of listeners) listener(effect);
    }
  }

  const onEffect = (listener: (effect: AxisEffect) => void): void => {
    listeners.push(listener);
  };

  return { state, dispatch, onEffect };
}

export type AxisMachine = ReturnType<typeof useAxisMachine>;
