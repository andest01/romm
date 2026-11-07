import type { StearchAction } from "../../Stearch.actions";
import { createSelector } from "../../Stearch.create-selector";
import { selectSections } from "../../Stearch.results.selectors";
import {
  selectIds,
  selectSelectedIds,
  selectVisiblePosition,
} from "../../Stearch.selectors";
import type { SectionProps } from "./section.props";

// Stub labels: move to locale keys before this leaves the fork.
const SELECT_LABEL = "Select";
const DESELECT_LABEL = "Deselect";
const PREV_LABEL = "‹ Prev";
const NEXT_LABEL = "Next ›";

const jumpTo = (position: number): StearchAction => ({
  type: "view/set",
  patch: { jump: { position, isSmooth: true } },
});

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
    const sectionIds = ids.slice(start, start + size);
    const isAllSelected = sectionIds.every((id) => selected.has(id));
    return {
      label: key,
      countLabel: `${size} ${size === 1 ? "game" : "games"}`,
      selectLabel: isAllSelected ? DESELECT_LABEL : SELECT_LABEL,
      selectActions: [
        {
          type: isAllSelected ? "selection/remove" : "selection/add",
          ids: sectionIds,
        },
      ],
      prevLabel: PREV_LABEL,
      prevActions: [jumpTo(sections[index - 1]?.start ?? 0)],
      nextLabel: NEXT_LABEL,
      nextActions: next ? [jumpTo(next.start)] : null,
    };
  },
);
