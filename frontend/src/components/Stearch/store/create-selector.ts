import type { IStearchState } from "./state-props";

type InputSelector = (state: IStearchState) => unknown;

type InputResults<T extends readonly InputSelector[]> = {
  [K in keyof T]: T[K] extends (state: IStearchState) => infer R ? R : never;
};

// Same call shape as reselect's createSelector, so it can be swapped for the
// real one by changing the import.
export function createSelector<const T extends readonly InputSelector[], R>(
  inputs: T,
  combine: (...args: InputResults<T>) => R,
): (state: IStearchState) => R {
  let cache: { args: unknown[]; result: R } | null = null;

  return (state) => {
    const args = inputs.map((input) => input(state));
    const hit = cache;
    if (hit && args.every((arg, i) => Object.is(arg, hit.args[i]))) {
      return hit.result;
    }
    const result = combine(...(args as InputResults<T>));
    cache = { args, result };
    return result;
  };
}
