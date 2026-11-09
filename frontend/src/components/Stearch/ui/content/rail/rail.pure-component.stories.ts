import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import RailPure from "./rail.pure-component.vue";

const meta: Meta<typeof RailPure> = {
  title: "Stearch/ui/content/rail/rail.pure-component.vue",
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

const bucket = (key: string, share: number, isCurrent: boolean) => ({
  key,
  label: key,
  share,
  isCurrent,
  navigateActions: [],
});

export const Letters: Story = {
  args: {
    buckets: [
      bucket("#", 0.05, false),
      bucket("A", 0.3, true),
      bucket("C", 0.5, false),
      bucket("Z", 0.15, false),
    ],
    thumb: { start: 0.1, size: 0.15 },
    label: "Jump to letter",
  },
};

/** A letter is a button: a press hands its actions back. */
export const PressingALetter: Story = {
  tags: ["!dev"],
  args: { ...Letters.args, onPress: fn() },
  play: async ({ args, canvasElement }) => {
    // Arrange
    const letter = within(canvasElement).getByRole("button", { name: "C" });

    // Act
    await userEvent.click(letter);

    // Assert
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

export const NoResults: Story = {
  args: { buckets: [], thumb: { start: 0, size: 1 }, label: "Jump to letter" },
};

/** A sort without letters: the rail is just a scrollbar thumb. */
export const ThumbOnly: Story = {
  args: {
    buckets: [],
    thumb: { start: 0.4, size: 0.1 },
    label: "Jump to letter",
  },
};
