import { createSelector } from "./create-selector";
import { selectSections } from "./results.selectors";
import { shortOf, SORT_FIELDS, spokenOf } from "./sort.fields";
import {
  selectSortDir,
  selectSortKey,
  selectVisiblePosition,
} from "./stearch.selectors";

/** The first sort level as groups. Every surface draws these same buckets. */
export const selectPrimaryGroup = createSelector(
  [selectSortKey, selectSections],
  (param, sections) => {
    const field = SORT_FIELDS[param];
    return {
      field,
      buckets: sections.map((section) => {
        const value = field.valueOf(section.key);
        return { ...section, value, label: spokenOf(value) };
      }),
    };
  },
);

/** The list's in-line headings, named the way the bucket is drawn. */
export const selectGroupHeadings = createSelector(
  [selectPrimaryGroup],
  ({ buckets }) =>
    buckets.map(({ value, start, size }) => ({
      key: shortOf(value),
      start,
      size,
    })),
);

/** Separate from the group: this one changes on every scroll step. */
export const selectCurrentBucket = createSelector(
  [selectPrimaryGroup, selectVisiblePosition],
  ({ buckets }, position) =>
    buckets.findLast(({ start }) => start <= position) ?? null,
);

/** What a screen reader hears as the sort or the current group changes. */
export const selectAnnouncement = createSelector(
  [selectPrimaryGroup, selectSortDir, selectCurrentBucket],
  ({ field }, dir, current) => {
    const sort = `Sorted by ${field.label}, ${field.directions[dir]}.`;
    return current ? `${sort} ${current.label}` : sort;
  },
);
