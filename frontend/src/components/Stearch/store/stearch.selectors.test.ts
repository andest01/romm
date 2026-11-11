import { describe, expect, it } from "vitest";
import { selectAnchorPosition } from "./attention.selectors";
import {
  LOADED_STEARCH_STATE,
  SECOND_STEARCH_ROW,
  STEARCH_ROM,
  STEARCH_ROW,
} from "./fixtures";
import { selectFiltersLayout } from "./layout.selectors";
import { selectLoadedRoms } from "./results.selectors";
import { coverUrlOf, selectRows, titleOf } from "./rows.selectors";
import { INITIAL_STEARCH_STATE, stearchReducer } from "./stearch.reducer";

const { results, query } = LOADED_STEARCH_STATE;
const withWindows = (windows: typeof results.windows) => ({
  ...LOADED_STEARCH_STATE,
  results: { ...results, windows },
});

describe("selectAnchorPosition", () => {
  it("anchors on the active item when it's loaded", () => {
    // Arrange
    const state = stearchReducer(LOADED_STEARCH_STATE, {
      type: "attention/set",
      patch: { activeId: SECOND_STEARCH_ROW.id },
    });

    // Act
    const position = selectAnchorPosition(state);

    // Assert
    expect(position).toBe(SECOND_STEARCH_ROW.position);
  });

  it("falls back to the top of the list without an active item", () => {
    // Arrange
    const state = stearchReducer(LOADED_STEARCH_STATE, {
      type: "view/set",
      patch: { visibleSpan: { first: 30, last: 40 } },
    });

    // Act
    const position = selectAnchorPosition(state);

    // Assert
    expect(position).toBe(30);
  });
});

describe("selectLoadedRoms", () => {
  it("joins windows in offset order", () => {
    // Arrange
    const state = withWindows({ 48: [], 0: [STEARCH_ROM] });

    // Act
    const roms = selectLoadedRoms(state);

    // Assert
    expect(roms).toEqual([STEARCH_ROM]);
  });
});

describe("selectRows", () => {
  it("activates on press and toggles the selection on select", () => {
    // Arrange
    const state = {
      ...LOADED_STEARCH_STATE,
      attention: { activeId: null, selectedIds: [STEARCH_ROW.id] },
    };

    // Act
    const [selected, unselected] = selectRows(state);

    // Assert
    expect(selected?.pressActions).toEqual([
      { type: "attention/set", patch: { activeId: STEARCH_ROW.id } },
    ]);
    expect(selected?.selectActions).toEqual([
      { type: "selection/remove", ids: [STEARCH_ROW.id] },
    ]);
    expect(unselected?.selectActions).toEqual([
      { type: "selection/add", ids: [SECOND_STEARCH_ROW.id] },
    ]);
  });

  it("marks matched text, ignoring case", () => {
    // Arrange
    const state = {
      ...LOADED_STEARCH_STATE,
      query: { ...query, searchTerm: "ACT" },
    };

    // Act
    const [row] = selectRows(state);

    // Assert
    expect(row?.titleParts).toEqual([
      { text: "Act", isMatch: true },
      { text: "raiser 1", isMatch: false },
    ]);
  });

  it("formats table columns, with a dash for missing values", () => {
    // Arrange
    const state = withWindows({
      0: [
        {
          ...STEARCH_ROM,
          metadatum: {
            ...STEARCH_ROM.metadatum,
            first_release_date: null,
            average_rating: 4.25,
          },
          hltb_metadata: { main_story: 5400 },
        },
      ],
    });

    // Act
    const [row] = selectRows(state);

    // Assert
    expect(row).toMatchObject({
      released: "—",
      rating: "★ 4.3",
      length: "1.5 h",
    });
  });
});

describe("titleOf", () => {
  it("accepts any object with just the fields it reads", () => {
    // Arrange
    const item = { name: null, fs_name: "a.sfc", extra: 1 };

    // Act
    const title = titleOf(item);

    // Assert
    expect(title).toBe("a.sfc");
  });
});

describe("coverUrlOf", () => {
  it("uses the local cover first", () => {
    // Arrange
    const item = { path_cover_small: "/local.png", url_cover: "r.png" };

    // Act
    const url = coverUrlOf(item);

    // Assert
    expect(url).toBe("/local.png");
  });

  it("falls back to the remote cover", () => {
    // Arrange
    const item = { path_cover_small: null, url_cover: "r.png" };

    // Act
    const url = coverUrlOf(item);

    // Assert
    expect(url).toBe("r.png");
  });
});

describe("selectFiltersLayout", () => {
  it("shows the panel by default", () => {
    // Act
    const { state: filtersState } = selectFiltersLayout(INITIAL_STEARCH_STATE);

    // Assert
    expect(filtersState).toBe("shown");
  });

  it("hides the panel once Advanced mode is closed", () => {
    // Arrange
    const state = {
      ...INITIAL_STEARCH_STATE,
      view: { ...INITIAL_STEARCH_STATE.view, isAdvancedOpen: false },
    };

    // Act
    const { state: filtersState } = selectFiltersLayout(state);

    // Assert
    expect(filtersState).toBe("hidden");
  });
});
