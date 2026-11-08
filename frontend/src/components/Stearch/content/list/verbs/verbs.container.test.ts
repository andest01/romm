import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { STEARCH_ROW } from "../../../store/fixtures";
import Verbs from "./verbs.container.vue";

const actionsShown = (isCompact: boolean) =>
  mount(Verbs, {
    props: { rom: STEARCH_ROW, isCompact },
    global: {
      stubs: {
        GameActionBtn: { props: ["action"], template: "<i>{{ action }}</i>" },
      },
    },
  })
    .findAll("i")
    .map((button) => button.text());

describe("verbs", () => {
  it("offers the favorite and the menu", () => {
    // Act
    const actions = actionsShown(false);

    // Assert
    expect(actions).toEqual(["favorite", "more"]);
  });

  it("keeps only the menu when compact", () => {
    // Act
    const actions = actionsShown(true);

    // Assert
    expect(actions).toEqual(["more"]);
  });
});
