import { LOADED_STEARCH_STATE } from "../../../store/fixtures";
import type {
  FieldPreview,
  MultiFieldPreview,
  RangeFieldPreview,
  TriStateFieldPreview,
} from "../filters-fields.props";
import { selectFieldPreviews } from "../filters-fields.selectors";

const previews = selectFieldPreviews({
  ...LOADED_STEARCH_STATE,
  query: {
    ...LOADED_STEARCH_STATE.query,
    selectedGenres: ["RPG"],
    filterFavorites: true,
    hltbMainStoryMin: 7200,
  },
});

function previewOf<K extends FieldPreview["kind"]>(kind: K) {
  const field = previews.find(
    (candidate): candidate is Extract<FieldPreview, { kind: K }> =>
      candidate.kind === kind && candidate.summary !== null,
  );
  if (!field) throw new Error(`No ${kind} field with a value`);
  return field;
}

export const MULTI_FIELD: MultiFieldPreview = previewOf("multi");
export const TRI_STATE_FIELD: TriStateFieldPreview = previewOf("tri-state");
export const RANGE_FIELD: RangeFieldPreview = previewOf("range");
