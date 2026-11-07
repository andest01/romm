import { describe, expect, it } from "vitest";
import {
  LOADED_STEARCH_STATE,
  SECOND_STEARCH_ROW,
  STEARCH_ROM,
  STEARCH_ROW,
} from "./Stearch.fixtures";
import { INITIAL_STEARCH_STATE, stearchReducer } from "./Stearch.reducer";
import {
  coverUrlOf,
  selectLoadedRoms,
  selectPanelLayout,
  selectRows,
  titleOf,
} from "./Stearch.selectors";
import { selectBackgroundProps } from "./background/background.selectors";

const { results, query } = LOADED_STEARCH_STATE;
const withWindows = (windows: typeof results.windows) => ({
  ...LOADED_STEARCH_STATE,
  results: { ...results, windows },
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
  it("rebuilds selection without rebuilding row actions", () => {
    // Arrange
    const before = selectRows(LOADED_STEARCH_STATE);
    const state = {
      ...LOADED_STEARCH_STATE,
      attention: { activeId: null, selectedIds: [1] },
    };

    // Act
    const after = selectRows(state);

    // Assert
    expect(after).not.toBe(before);
    expect(after[0]?.pressActions).toBe(before[0]?.pressActions);
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

describe("background", () => {
  it("follows the active item", () => {
    // Arrange
    const state = STEARCH_ROW.hoverActions.reduce(
      stearchReducer,
      LOADED_STEARCH_STATE,
    );

    // Act
    const { url } = selectBackgroundProps(state);

    // Assert
    expect(url).toBe(STEARCH_ROW.coverUrl);
  });

  it("falls back to the latest selection", () => {
    // Arrange
    const state = {
      ...LOADED_STEARCH_STATE,
      attention: {
        activeId: null,
        selectedIds: [STEARCH_ROW.id, SECOND_STEARCH_ROW.id],
      },
    };

    // Act
    const { url } = selectBackgroundProps(state);

    // Assert
    expect(url).toBe(SECOND_STEARCH_ROW.coverUrl);
  });

  it("is empty with nothing attended to", () => {
    // Act
    const { url } = selectBackgroundProps(LOADED_STEARCH_STATE);

    // Assert
    expect(url).toBeNull();
  });
});

describe("selectPanelLayout", () => {
  it("shows the panel by default", () => {
    // Act
    const { isPanelShown } = selectPanelLayout(INITIAL_STEARCH_STATE);

    // Assert
    expect(isPanelShown).toBe(true);
  });

  it("hides the panel once Advanced mode is closed", () => {
    // Arrange
    const state = {
      ...INITIAL_STEARCH_STATE,
      view: { ...INITIAL_STEARCH_STATE.view, isAdvancedOpen: false },
    };

    // Act
    const { isPanelShown } = selectPanelLayout(state);

    // Assert
    expect(isPanelShown).toBe(false);
  });
});
