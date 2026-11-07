import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STEARCH_ROW } from "../../../Stearch.fixtures";
import type { ListSlot } from "../../../Stearch.rows.selectors";
import GalleryRow from "./gallery-row.container.vue";

vi.mock("vue-i18n");

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

const mountRow = (row: ListSlot) =>
  mount(GalleryRow, {
    props: { row, verbs: () => null },
    global: {
      stubs: {
        GameActionBtn: true,
        GameCard: true,
        RCheckbox: true,
        RChip: true,
        RIcon: true,
        PlatformIcon: true,
        RTooltip: true,
        SiblingBadge: true,
      },
    },
  });

describe("gallery row as a Stearch item", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders the existing row from one of our rows", () => {
    // Act
    const wrapper = mountRow(STEARCH_ROW);

    // Assert
    expect(wrapper.find(".game-list-row").attributes("data-rom-id")).toBe(
      String(STEARCH_ROW.id),
    );
  });

  it("hands hover actions back", async () => {
    // Arrange
    const wrapper = mountRow(STEARCH_ROW);

    // Act
    await wrapper.find(".game-list-row").trigger("mouseenter");

    // Assert
    expect(wrapper.emitted("press")).toEqual([[STEARCH_ROW.hoverActions]]);
  });

  it("stays quiet on a slot that isn't loaded", async () => {
    // Arrange
    const wrapper = mountRow(null);

    // Act
    await wrapper.find(".game-list-row").trigger("mouseenter");

    // Assert
    expect(wrapper.emitted("press")).toBeUndefined();
  });
});
