import type { StearchLabels } from "./Stearch.labels";
import type {
  MultiKey,
  StearchPage,
  StearchQuery,
  StearchViewMode,
} from "./Stearch.state-props";

export type StearchQueryAction =
  | { readonly type: "query/set"; readonly patch: Partial<StearchQuery> }
  | {
      readonly type: "query/toggle";
      readonly key: MultiKey;
      readonly value: string;
    };

export type StearchViewAction =
  | { readonly type: "view/set"; readonly mode: StearchViewMode }
  | { readonly type: "view/visible"; readonly position: number }
  | {
      readonly type: "view/jump";
      readonly position: number;
      readonly isSmooth: boolean;
    }
  | { readonly type: "view/band"; readonly offset: number }
  | { readonly type: "advanced/toggle" }
  | { readonly type: "field/open"; readonly id: string | null }
  | { readonly type: "locale/set"; readonly labels: StearchLabels };

export type StearchAttentionAction =
  | { readonly type: "attention/active"; readonly id: number | null }
  | { readonly type: "selection/toggle"; readonly id: number }
  | { readonly type: "selection/all" }
  | {
      readonly type: "selection/section";
      readonly start: number;
      readonly size: number;
    }
  | { readonly type: "selection/clear" };

export type StearchWindowAction =
  | { readonly type: "window/wanted"; readonly offset: number }
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
