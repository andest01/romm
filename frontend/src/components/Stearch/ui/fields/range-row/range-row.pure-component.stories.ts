import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { computed } from "vue";
import RangeRow from "./range-row.pure-component.vue";

interface Args {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  onRange: () => void;
}

const meta: Meta<Args> = {
  title: "Stearch/ui/fields/range-row/range-row.pure-component.vue",
  tags: ["!autodocs"],
  argTypes: {
    min: { control: { type: "range", min: 0, max: 200, step: 1 } },
    max: { control: { type: "range", min: 0, max: 200, step: 1 } },
    minLabel: { control: "text" },
    maxLabel: { control: "text" },
    onRange: { control: false },
  },
  args: {
    min: 2,
    max: 40,
    minLabel: "Min hours",
    maxLabel: "Max hours",
    onRange: fn(),
  },
  render: (args) => ({
    components: { RangeRow },
    setup: () => ({
      args,
      range: computed(() => ({ min: args.min, max: args.max })),
    }),
    template: `
      <RangeRow
        :range="range"
        :min-label="args.minLabel"
        :max-label="args.maxLabel"
        @range="args.onRange"
      />
    `,
  }),
};

export default meta;

type Story = StoryObj<Args>;

export const Playground: Story = {};

export const TypingHandsTheValueBack: Story = {
  play: async ({ args, canvasElement }) => {
    const [minField] = within(canvasElement).getAllByRole("spinbutton");
    if (!minField) throw new Error("No field rendered");
    await userEvent.type(minField, "5");
    await expect(args.onRange).toHaveBeenCalled();
  },
};
