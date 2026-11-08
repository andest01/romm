import type { IStearchState } from "./state-props";

// The trunk: the only code allowed to read IStearchState. Each selector returns
// one field as stored. Branches in Stearch.<family>.selectors.ts build on these.

// query
export const selectQuery = (state: IStearchState) => state.query;
export const selectSearchTerm = (state: IStearchState) =>
  state.query.searchTerm;
export const selectSortKey = (state: IStearchState) => state.query.orderBy;
export const selectSortDir = (state: IStearchState) => state.query.orderDir;
export const selectPlatformIds = (state: IStearchState) =>
  state.query.platformIds;

// view
export const selectViewMode = (state: IStearchState) => state.view.mode;
export const selectIsAdvancedOpen = (state: IStearchState) =>
  state.view.isAdvancedOpen;
export const selectVisibleSpan = (state: IStearchState) =>
  state.view.visibleSpan;
export const selectVisiblePosition = (state: IStearchState) =>
  state.view.visibleSpan.first;
export const selectJump = (state: IStearchState) => state.view.jump;
export const selectOpenFieldId = (state: IStearchState) =>
  state.view.openFieldId;

// labels
export const selectLabels = (state: IStearchState) => state.labels;

// results
export const selectStatus = (state: IStearchState) => state.results.status;
export const selectIds = (state: IStearchState) => state.results.ids;
export const selectCharIndex = (state: IStearchState) =>
  state.results.charIndex;
export const selectFilterValues = (state: IStearchState) =>
  state.results.filterValues;
export const selectWindows = (state: IStearchState) => state.results.windows;

// attention
export const selectActiveId = (state: IStearchState) =>
  state.attention.activeId;
export const selectSelectedIds = (state: IStearchState) =>
  state.attention.selectedIds;
