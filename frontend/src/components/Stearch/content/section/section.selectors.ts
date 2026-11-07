import { createSelector } from "../../Stearch.create-selector";
import {
  selectIds,
  selectSections,
  selectSelectedIds,
  selectVisiblePosition,
} from "../../Stearch.selectors";
import type { IStearchState } from "../../Stearch.state-props";
import type { SectionProps } from "./section.props";

// Stub labels: move to locale keys before this leaves the fork.
const SELECT_LABEL = "Select";
const DESELECT_LABEL = "Deselect";
const PREV_LABEL = "‹ Prev";
const NEXT_LABEL = "Next ›";

export const selectBandOffset = (state: IStearchState) => state.view.bandOffset;

/** The section at the top of the list; `null` for sorts without sections. */
export const selectSectionProps = createSelector(
  [selectSections, selectVisiblePosition, selectIds, selectSelectedIds],
  (sections, position, ids, selectedIds): SectionProps | null => {
    const index = sections.findLastIndex(({ start }) => start <= position);
    const section = sections[index];
    if (!section) return null;
    const { key, start, size } = section;
    const next = sections[index + 1];
    const selected = new Set(selectedIds);
    const isAllSelected = ids
      .slice(start, start + size)
      .every((id) => selected.has(id));
    return {
      label: key,
      countLabel: `${size} ${size === 1 ? "game" : "games"}`,
      selectLabel: isAllSelected ? DESELECT_LABEL : SELECT_LABEL,
      selectActions: [{ type: "selection/section", start, size }],
      prevLabel: PREV_LABEL,
      prevActions: [
        {
          type: "view/jump",
          position: sections[index - 1]?.start ?? 0,
          isSmooth: true,
        },
      ],
      nextLabel: NEXT_LABEL,
      nextActions: next
        ? [{ type: "view/jump", position: next.start, isSmooth: true }]
        : null,
    };
  },
);
