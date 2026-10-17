import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { useUISettings } from "@/composables/useUISettings";
import { romFixture } from "@/utils/rom.fixtures";
import GameCard from "./GameCard.vue";
import GameCardCompact from "./GameCardCompact.vue";

vi.mock("vue-i18n");

const rom = romFixture({
  id: 7,
  name: "Super Mario World",
  platform_slug: "snes",
  platform_display_name: "Super Nintendo",
  platform_custom_name: null,
  path_cover_small: "/res/roms/1/7/cover/small.png?v=abc",
  path_cover_large: "/res/roms/1/7/cover/big.png?v=abc",
  regions: ["US"],
  is_identified: true,
  updated_at: "2026-10-17T05:03:38+00:00",
});

function mountCard(props: Record<string, unknown> = {}) {
  return mount(GameCardCompact, { props: { rom, ...props } });
}

describe("GameCardCompact is a drop-in for GameCard", () => {
  it("declares exactly GameCard's props", () => {
    expect(Object.keys(GameCardCompact.props ?? {}).sort()).toEqual(
      Object.keys(GameCard.props ?? {}).sort(),
    );
  });

  it("gives every prop GameCard's default", () => {
    const compact = GameCardCompact.props as Record<
      string,
      { default?: unknown }
    >;
    const card = GameCard.props as Record<string, { default?: unknown }>;

    for (const name of Object.keys(card)) {
      expect(compact[name]?.default, name).toEqual(card[name]?.default);
    }
  });

  it("declares exactly GameCard's events", () => {
    expect([...(GameCardCompact.emits as string[])].sort()).toEqual(
      [...(GameCard.emits as string[])].sort(),
    );
  });
});

describe("GameCardCompact", () => {
  it("is six elements: the link, a title, and an info row of four", () => {
    const wrapper = mountCard();

    expect(wrapper.element.querySelectorAll("*").length + 1).toBe(6);
    expect(wrapper.element.tagName).toBe("A");
  });

  it("links to the rom, or to `to`, and names it in its title and visible label", () => {
    const wrapper = mountCard();

    expect(wrapper.attributes("href")).toBe("/rom/7");
    expect(wrapper.attributes("title")).toBe("Super Mario World");
    expect(wrapper.find(".r-v2-compact-card__title").text()).toBe(
      "Super Mario World",
    );
    expect(mountCard({ to: "/elsewhere" }).attributes("href")).toBe(
      "/elsewhere",
    );
  });

  it("sets the small cover as a CSS variable and marks no 'no cover' state", () => {
    const wrapper = mountCard();

    expect(wrapper.attributes("style")).toContain(
      '--cover: url("/res/roms/1/7/cover/small.png?v=abc")',
    );
    expect(wrapper.classes()).not.toContain("is-nocover");
  });

  it("uses a coverSrc override ahead of the rom's own cover", () => {
    const wrapper = mountCard({ coverSrc: "blob:preview" });

    expect(wrapper.attributes("style")).toContain('url("blob:preview")');
  });

  it("shows the hatched empty state when there is no cover", () => {
    const wrapper = mountCard({
      rom: {
        ...rom,
        path_cover_small: "",
        path_cover_large: "",
        url_cover: null,
      },
    });

    expect(wrapper.classes()).toContain("is-nocover");
    expect(wrapper.attributes("style") ?? "").not.toContain("--cover");
  });

  it("shows region flags and the date, and hides the flags per the setting", () => {
    const { showRegions } = useUISettings();
    showRegions.value = true;
    expect(mountCard().find(".r-v2-compact-card__text").text()).toBe(
      "🇺🇸 Oct 2026",
    );

    showRegions.value = false;
    expect(mountCard().find(".r-v2-compact-card__text").text()).toBe(
      "Oct 2026",
    );
    showRegions.value = true;
  });

  it("shows only the first region, so the date always fits", () => {
    const wrapper = mountCard({ rom: { ...rom, regions: ["US", "EU", "JP"] } });

    expect(wrapper.find(".r-v2-compact-card__text").text()).toBe("🇺🇸 Oct 2026");
  });

  it("can hide the title and the platform icon", () => {
    const wrapper = mountCard({ showTitle: false, showPlatformIcon: false });

    expect(wrapper.find(".r-v2-compact-card__title").exists()).toBe(false);
    expect(wrapper.find(".r-v2-compact-card__plat").exists()).toBe(false);
  });

  it("marks a matched rom with a hidden check and an unmatched one with a labelled question mark", () => {
    const matched = mountCard().find(".r-v2-compact-card__match");
    expect(matched.text()).toBe("✓");
    expect(matched.attributes("aria-hidden")).toBe("true");

    const unmatched = mountCard({
      rom: { ...rom, is_identified: false },
    }).find(".r-v2-compact-card__match");
    expect(unmatched.text()).toBe("?");
    expect(unmatched.attributes("role")).toBe("img");
    expect(unmatched.attributes("aria-label")).toBeTruthy();
  });

  it("keeps only the focused card in the tab order and carries its grid position", () => {
    expect(mountCard().attributes("tabindex")).toBe("-1");
    const focused = mountCard({ focused: true, position: 41 });

    expect(focused.attributes("tabindex")).toBe("0");
    expect(focused.classes()).toContain("is-cursor");
    expect(focused.attributes("data-pos")).toBe("41");
    expect(focused.attributes("data-rom-id")).toBe("7");
  });

  it("accepts a ROM with only the fields it paints", () => {
    const painted = {
      id: 9,
      name: "Painted only",
      fs_name_no_ext: "Painted only",
      platform_slug: "snes",
      platform_fs_slug: "snes",
      platform_display_name: "SNES",
      platform_custom_name: null,
      is_identified: true,
      regions: [],
      path_cover_small: "",
      path_cover_large: "",
      url_cover: null,
      updated_at: "2026-10-17T05:03:38+00:00",
    };

    expect(mountCard({ rom: painted }).attributes("href")).toBe("/rom/9");
  });
});
