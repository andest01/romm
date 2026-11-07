import { describe, expect, it } from "vitest";
import { selectAnchorPosition } from "./Stearch.attention.selectors";
import {
  LOADED_STEARCH_STATE,
  SECOND_STEARCH_ROW,
  STEARCH_ROM,
  STEARCH_ROW,
} from "./Stearch.fixtures";
import { selectPanelLayout } from "./Stearch.layout.selectors";
import { INITIAL_STEARCH_STATE, stearchReducer } from "./Stearch.reducer";
import { selectLoadedRoms } from "./Stearch.results.selectors";
import { coverUrlOf, selectRows, titleOf } from "./Stearch.rows.selectors";
import { selectBackgroundProps } from "./background/background.selectors";

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
  it("presses to add an unselected row and remove a selected one", () => {
    // Arrange
    const state = {
      ...LOADED_STEARCH_STATE,
      attention: { activeId: null, selectedIds: [STEARCH_ROW.id] },
    };

    // Act
    const [selected, unselected] = selectRows(state);

    // Assert
    expect(selected?.pressActions).toEqual([
      { type: "selection/remove", ids: [STEARCH_ROW.id] },
    ]);
    expect(unselected?.pressActions).toEqual([
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
    const { panelState } = selectPanelLayout(INITIAL_STEARCH_STATE);

    // Assert
    expect(panelState).toBe("shown");
  });

  it("hides the panel once Advanced mode is closed", () => {
    // Arrange
    const state = {
      ...INITIAL_STEARCH_STATE,
      view: { ...INITIAL_STEARCH_STATE.view, isAdvancedOpen: false },
    };

    // Act
    const { panelState } = selectPanelLayout(state);

    // Assert
    expect(panelState).toBe("hidden");
  });
});
