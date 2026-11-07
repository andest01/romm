import type { Meta, StoryObj } from "@storybook/vue3-vite";
import RailPure from "./rail.pure-component.vue";

const meta: Meta<typeof RailPure> = {
  title: "Stearch/content/rail/rail.pure-component.vue",
  tags: ["!autodocs"],
  component: RailPure,
  decorators: [
    () => ({
      template: `<div style="width:38px;height:320px"><story /></div>`,
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof RailPure>;

export const Letters: Story = {
  args: {
    buckets: [
      { key: "#", label: "#", share: 0.05, isCurrent: false },
      { key: "A", label: "A", share: 0.3, isCurrent: true },
      { key: "C", label: "C", share: 0.5, isCurrent: false },
      { key: "Z", label: "Z", share: 0.15, isCurrent: false },
    ],
  },
};

export const NoResults: Story = { args: { buckets: [] } };
