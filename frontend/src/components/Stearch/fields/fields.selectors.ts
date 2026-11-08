import { STEARCH_FIELDS, type FieldCoreConcept } from "../Stearch.fields";
import type { StearchAction } from "../store/actions";
import { createSelector } from "../store/create-selector";
import type { StearchLabels } from "../store/labels";
import {
  selectFilterValues,
  selectLabels,
  selectQuery,
} from "../store/selectors";
import type { StearchFilterValues, StearchQuery } from "../store/state-props";
import type {
  ChoicePreview,
  ChoiceState,
  FieldPreview,
  MultiFieldPreview,
  RangeChange,
  RangeFieldPreview,
  TriStateFieldPreview,
  PlatformFieldPreview,
} from "./fields.props";

/** A computed key alone loses the value check, so this keeps it. */
const patchOf = <K extends keyof StearchQuery>(
  key: K,
  value: StearchQuery[K],
): Partial<StearchQuery> => ({ [key]: value });

const SECONDS_PER_HOUR = 3600;
// Stub labels: move to locale keys before this leaves the fork.
const LOGIC_LABELS = { any: "Any", all: "All", none: "None" } as const;
const LOGIC_WORDS = { any: "", all: "all of ", none: "none of " } as const;
const LOGIC_OPERATORS = ["any", "all", "none"] as const;

function logicWords(logic: string | null): string {
  return logic === "all" || logic === "none" ? LOGIC_WORDS[logic] : "";
}

function multiPreview(
  field: Extract<FieldCoreConcept, { kind: "multi" }>,
  query: StearchQuery,
  values: StearchFilterValues,
  label: string,
): MultiFieldPreview {
  const selected = query[field.key];
  const logic = query[field.logicKey];
  return {
    kind: "multi",
    id: field.id,
    label,
    summary:
      selected.length > 0
        ? `${label}: ${logicWords(logic)}${selected.join(", ")}`
        : null,
    choices: values[field.valuesFrom].map((value): ChoicePreview => {
      const isOn = selected.includes(value);
      return {
        id: `${field.id}:${value}`,
        label: value,
        count: null,
        state: isOn ? "on" : "off",
        actions: [
          { type: isOn ? "query/remove" : "query/add", key: field.key, value },
        ],
      };
    }),
    logic: LOGIC_OPERATORS.map((operator) => ({
      id: `${field.id}:${operator}`,
      label: LOGIC_LABELS[operator],
      isActive: logic === operator,
      actions: [
        { type: "query/set", patch: patchOf(field.logicKey, operator) },
      ],
    })),
    clearActions: [{ type: "query/set", patch: patchOf(field.key, []) }],
    openActions: [{ type: "view/set", patch: { openFieldId: field.id } }],
  };
}

function triStatePreview(
  field: Extract<FieldCoreConcept, { kind: "tri-state" }>,
  query: StearchQuery,
  label: string,
): TriStateFieldPreview {
  const value = query[field.key];
  const next = value === null ? true : value ? false : null;
  const state: ChoiceState = value === null ? "off" : value ? "on" : "excluded";
  const summaries = { on: label, excluded: `not ${label}`, off: null };
  return {
    kind: "tri-state",
    id: field.id,
    label,
    summary: summaries[state],
    choice: {
      id: field.id,
      label,
      count: null,
      state,
      actions: [{ type: "query/set", patch: patchOf(field.key, next) }],
    },
    clearActions: [{ type: "query/set", patch: patchOf(field.key, null) }],
  };
}

function rangePreview(
  field: Extract<FieldCoreConcept, { kind: "range" }>,
  query: StearchQuery,
  label: string,
): RangeFieldPreview {
  const hours = (seconds: number | null) =>
    seconds === null ? null : seconds / SECONDS_PER_HOUR;
  const min = hours(query[field.minKey]);
  const max = hours(query[field.maxKey]);
  return {
    kind: "range",
    id: field.id,
    label,
    summary:
      min === null && max === null
        ? null
        : `${label}: ${min ?? 0} to ${max ?? "∞"} h`,
    range: { min, max },
    clearActions: [
      {
        type: "query/set",
        patch: {
          ...patchOf(field.minKey, null),
          ...patchOf(field.maxKey, null),
        },
      },
    ],
  };
}

function platformPreview(
  field: Extract<FieldCoreConcept, { kind: "platform" }>,
  query: StearchQuery,
  label: string,
): PlatformFieldPreview {
  const count = query[field.key].length;
  return {
    kind: "platform",
    id: field.id,
    label,
    summary: count > 0 ? `${label}: ${count}` : null,
    clearActions: [{ type: "query/set", patch: patchOf(field.key, []) }],
  };
}

function previewOf(
  field: FieldCoreConcept,
  query: StearchQuery,
  values: StearchFilterValues,
  labels: StearchLabels,
): FieldPreview {
  const label = labels[field.labelKey];
  switch (field.kind) {
    case "multi":
      return multiPreview(field, query, values, label);
    case "tri-state":
      return triStatePreview(field, query, label);
    case "range":
      return rangePreview(field, query, label);
    case "platform":
      return platformPreview(field, query, label);
  }
}

/** Every field, ready to show. All search surfaces are views of this. */
export const selectFieldPreviews = createSelector(
  [selectQuery, selectFilterValues, selectLabels],
  (query, values, labels): readonly FieldPreview[] =>
    STEARCH_FIELDS.map((field) => previewOf(field, query, values, labels)),
);

/** A typed value is one only the DOM knows, so it's built here. */
export function buildRangeActions({
  bound,
  value,
}: RangeChange): readonly StearchAction[] {
  const hours = value === "" ? null : Number(value);
  const seconds = hours === null ? null : hours * SECONDS_PER_HOUR;
  const key = bound === "min" ? "hltbMainStoryMin" : "hltbMainStoryMax";
  return [{ type: "query/set", patch: patchOf(key, seconds) }];
}
