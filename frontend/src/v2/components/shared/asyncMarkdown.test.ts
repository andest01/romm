import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import i18n from "@/locales";
import { lazyMarkdown } from "./asyncMarkdown";

// Stands in for md-editor, so these tests cover the loading wrapper alone.
const Loaded = defineComponent({
  props: { modelValue: { type: String, default: "" } },
  render() {
    return h("div", { class: "md-stub" }, this.modelValue);
  },
});

// A dynamic import() resolves to a module; Vue only unwraps .default from one.
const asModule = (component: typeof Loaded) => ({
  __esModule: true,
  default: component,
});

describe("lazyMarkdown", () => {
  it("renders the loaded component with the caller's attrs", async () => {
    const Lazy = lazyMarkdown(() => Promise.resolve(asModule(Loaded)), "4rem");
    const wrapper = mount(Lazy, {
      attrs: { modelValue: "# Hi", class: "caller" },
    });

    await vi.waitFor(() =>
      expect(wrapper.find(".md-stub").exists()).toBe(true),
    );

    expect(wrapper.find(".md-stub").text()).toBe("# Hi");
    expect(wrapper.find(".md-stub").classes()).toContain("caller");
  });

  it("shows a skeleton, without the caller's attrs, while the chunk is pending", async () => {
    vi.useFakeTimers();
    try {
      const Lazy = lazyMarkdown(() => new Promise(() => {}), "4rem");
      const wrapper = mount(Lazy, { attrs: { modelValue: "# Hi" } });
      // Past the 200ms delay before defineAsyncComponent shows its loading view.
      await vi.advanceTimersByTimeAsync(300);
      await flushPromises();

      expect(wrapper.find(".r-skeleton").exists()).toBe(true);
      expect(wrapper.find(".md-stub").exists()).toBe(false);
      expect(wrapper.html()).not.toContain("modelvalue");
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers a retry when the chunk fails and recovers on retry", async () => {
    const loader = vi
      .fn<() => Promise<ReturnType<typeof asModule>>>()
      .mockRejectedValueOnce(new Error("chunk failed"))
      .mockResolvedValue(asModule(Loaded));
    const wrapper = mount(lazyMarkdown(loader, "4rem"), {
      global: { plugins: [i18n] },
    });
    await vi.waitFor(() =>
      expect(wrapper.find("[role='alert']").exists()).toBe(true),
    );
    expect(wrapper.find(".md-stub").exists()).toBe(false);

    await wrapper.find("button").trigger("click");

    await vi.waitFor(() =>
      expect(wrapper.find(".md-stub").exists()).toBe(true),
    );
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
