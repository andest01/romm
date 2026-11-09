import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import SavedSearches from "./saved-searches.pure-component.vue";

const meta: Meta<typeof SavedSearches> = {
  title: "Stearch/ui/header/saved-searches.pure-component.vue",
  tags: ["!autodocs"],
  component: SavedSearches,
  args: {
    label: "Saved searches",
    name: "",
    nameLabel: "Name this search",
    saveLabel: "Save as smart collection",
    canSave: false,
    searches: [{ id: 7, name: "Short RPGs" }],
    message: "",
  },
};

export default meta;

type Story = StoryObj<typeof SavedSearches>;

export const Playground: Story = {};

export const LoadingHandsTheIdBack: Story = {
  args: { onLoad: fn() },
  play: async ({ args, canvasElement }) => {
    // Act
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Saved searches" }),
    );
    await userEvent.click(
      await within(document.body).findByRole("menuitem", {
        name: "Short RPGs",
      }),
    );

    // Assert
    await expect(args.onLoad).toHaveBeenCalledWith(7);
  },
};
