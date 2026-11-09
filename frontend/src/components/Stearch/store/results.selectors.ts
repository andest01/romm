import { createSelector } from "./create-selector";
import {
  selectBucketIndex,
  selectIds,
  selectStatus,
  selectWindows,
} from "./stearch.selectors";

export const selectTotal = createSelector([selectIds], (ids) => ids.length);

/** Runs of results in one bucket of the first sort level. */
export const selectSections = createSelector(
  [selectBucketIndex, selectTotal],
  (bucketIndex, total) => {
    const starts = Object.entries(bucketIndex).sort(([, a], [, b]) => a - b);
    return starts.map(([key, start], index) => {
      const next = starts[index + 1];
      return { key, start, size: (next ? next[1] : total) - start };
    });
  },
);

/** Every loaded rom with its place among all results. */
export const selectPositionedRoms = createSelector([selectWindows], (windows) =>
  Object.entries(windows)
    .map(([offset, roms]) => ({ offset: Number(offset), roms }))
    .sort((a, b) => a.offset - b.offset)
    .flatMap(({ offset, roms }) =>
      roms.map((rom, index) => ({ rom, position: offset + index })),
    ),
);

export const selectLoadedRoms = createSelector(
  [selectPositionedRoms],
  (positioned) => positioned.map(({ rom }) => rom),
);

export const selectIsLoading = createSelector(
  [selectStatus],
  (status) => status.kind === "idle" || status.kind === "loading",
);

export const selectErrorMessage = createSelector([selectStatus], (status) =>
  status.kind === "failed" ? status.message : null,
);
