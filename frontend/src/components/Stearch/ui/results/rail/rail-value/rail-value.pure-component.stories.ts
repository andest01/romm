import type { Meta, StoryObj } from "@storybook/vue3-vite";
import RailValue from "./rail-value.pure-component.vue";

const meta: Meta<typeof RailValue> = {
  title: "Stearch/ui/results/rail/rail-value/rail-value.pure-component.vue",
  tags: ["!autodocs"],
  component: RailValue,
  argTypes: { value: { control: "object" } },
  args: { value: { kind: "text", text: "A" } },
};

export default meta;

type Story = StoryObj<typeof RailValue>;

export const Text: Story = {};

export const Stars: Story = { args: { value: { kind: "stars", stars: 4 } } };

export const Year: Story = { args: { value: { kind: "year", year: 1994 } } };
