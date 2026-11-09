import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent, within } from "storybook/test";
import { h } from "vue";
import { SEARCH_LABEL_ID } from "./header.pure-layout-props";
import HeaderLayout from "./header.pure-layout.vue";

const SEARCH = () => [
  h("span", { id: SEARCH_LABEL_ID, hidden: true }, "Search games"),
  h("button", { type: "button" }, "Search"),
];
const CONTROLS = () => h("button", { type: "button" }, "Controls");
const PILLS = () => h("button", { type: "button" }, "Pills");

const meta: Meta<typeof HeaderLayout> = {
  title: "Stearch/ui/header/header.pure-layout.vue",
  tags: ["!autodocs"],
  component: HeaderLayout,
  parameters: { layout: "fullscreen" },
  argTypes: {
    search: { control: false },
    controls: { control: false },
    pills: {
      options: ["part", "none"],
      mapping: { part: PILLS, none: null },
      control: "radio",
    },
  },
  args: { search: SEARCH, controls: CONTROLS, pills: PILLS },
};

export default meta;

type Story = StoryObj<typeof HeaderLayout>;

export const Playground: Story = {};

export const NoPills: Story = { args: { pills: null } };

export const TabOrderIsSearchControlsPills: Story = {
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);

    // Act
    await userEvent.tab();
    const first = document.activeElement;
    await userEvent.tab();
    const second = document.activeElement;
    await userEvent.tab();
    const third = document.activeElement;

    // Assert
    await expect(first).toBe(canvas.getByRole("button", { name: "Search" }));
    await expect(second).toBe(canvas.getByRole("button", { name: "Controls" }));
    await expect(third).toBe(canvas.getByRole("button", { name: "Pills" }));
  },
};
