import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import HeaderSearch from "./header-search.pure-component.vue";

const meta: Meta<typeof HeaderSearch> = {
  title: "Stearch/ui/header/header-search.pure-component.vue",
  tags: ["!autodocs"],
  component: HeaderSearch,
  argTypes: { resultCount: { control: { type: "range", min: 0, max: 5000 } } },
  args: {
    term: "",
    label: "Search games",
    placeholder: "Name, filename, hash...",
    resultCount: 601,
  },
};

export default meta;

type Story = StoryObj<typeof HeaderSearch>;

export const Playground: Story = {};

export const Typing: Story = {
  args: { onSearch: fn() },
  play: async ({ args, canvasElement }) => {
    // Act
    await userEvent.type(within(canvasElement).getByRole("textbox"), "z");

    // Assert
    await expect(args.onSearch).toHaveBeenCalledWith("z");
  },
};
