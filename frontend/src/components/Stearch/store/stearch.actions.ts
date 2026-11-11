import type { StearchLabels } from "./labels";
import type { LoadPace } from "./read-ahead";
import type {
  AttentionCoreConcept,
  IStearchState,
  MultiKey,
  StearchPage,
  StearchQuery,
} from "./stearch.state-props";

type StearchView = IStearchState["view"];

/** Every action is a plain object named by what happened. */
export interface Action<T extends string = string> {
  readonly type: T;
}

// Every action is idempotent: sending it twice changes nothing more. Selectors
// read the state and choose the direction, so there are no toggles.

export type StearchQueryAction =
  | { readonly type: "query/set"; readonly patch: Partial<StearchQuery> }
  | {
      readonly type: "query/add" | "query/remove";
      readonly key: MultiKey;
      readonly value: string;
    };

export type StearchViewAction =
  | { readonly type: "view/set"; readonly patch: Partial<StearchView> }
  | { readonly type: "locale/set"; readonly labels: StearchLabels };

export type StearchAttentionAction =
  | {
      readonly type: "attention/set";
      readonly patch: Partial<AttentionCoreConcept>;
    }
  | {
      readonly type: "selection/add" | "selection/remove";
      readonly ids: readonly number[];
    };

export type StearchWindowAction =
  | {
      readonly type: "window/wanted";
      readonly offset: number;
      readonly pace: LoadPace;
    }
  | { readonly type: "window/requested"; readonly requestId: number }
  | {
      readonly type: "window/loaded";
      readonly requestId: number;
      readonly offset: number;
      readonly page: StearchPage;
    }
  | {
      readonly type: "window/failed";
      readonly requestId: number;
      readonly message: string;
    };

export type StearchAction =
  | StearchQueryAction
  | StearchViewAction
  | StearchAttentionAction
  | StearchWindowAction;

/** The action with this `type`. */
export type ActionOf<A extends Action, T extends A["type"]> = Extract<
  A,
  Action<T>
>;

/** One handler per action type, each handed exactly its own action. A missing
 *  or extra key is a compile error. */
export type Handlers<S, A extends Action> = {
  readonly [T in A["type"]]: (state: S, action: ActionOf<A, T>) => S;
};

/** Turns a handler table into a reducer, with no switch and no cast. */
export function reducerOf<S, A extends Action>(handlers: Handlers<S, A>) {
  return <T extends A["type"]>(state: S, action: ActionOf<A, T>): S => {
    const handle: (state: S, action: ActionOf<A, T>) => S =
      handlers[action.type];
    return handle(state, action);
  };
}
