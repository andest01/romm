<script setup lang="ts">
// One axis's state machine, lit by where the active cell stands now.
import { type AxisState, axisMode } from "../axis-machine";

defineProps<{
  label: string;
  state: AxisState;
  previous: AxisState | null;
}>();

const NODES = [
  { state: "cruising", x: 8, y: -34 },
  { state: "captured", x: 8, y: 8 },
  { state: "pinned", x: 120, y: 8 },
  { state: "free", x: 64, y: 78 },
] as const satisfies readonly { state: AxisState; x: number; y: number }[];

const EDGES = [
  { from: "captured", to: "cruising", path: "M30 8 V-8" },
  { from: "cruising", to: "captured", path: "M54 -10 V6" },
  { from: "captured", to: "pinned", path: "M80 15 H118" },
  { from: "pinned", to: "captured", path: "M120 25 H82" },
  { from: "pinned", to: "free", path: "M150 32 V88 H138" },
  { from: "free", to: "pinned", path: "M136 98 H166 V34" },
  { from: "free", to: "captured", path: "M64 88 H50 V34" },
  { from: "captured", to: "free", path: "M34 32 V98 H62" },
] as const satisfies readonly {
  from: AxisState;
  to: AxisState;
  path: string;
}[];
</script>

<template>
  <figure class="fsm-live" :data-testid="`fsm-${label}`" :data-state="state">
    <figcaption>{{ label }}: {{ axisMode(state) }}</figcaption>
    <svg
      viewBox="0 -36 200 148"
      role="img"
      :aria-label="`${label} are ${state}`"
    >
      <path
        v-for="edge in EDGES"
        :key="edge.path"
        class="fsm-live__edge"
        :data-last="edge.from === previous && edge.to === state"
        :d="edge.path"
      />
      <g
        v-for="node in NODES"
        :key="node.state"
        class="fsm-live__node"
        :data-current="node.state === state"
      >
        <rect :x="node.x" :y="node.y" width="72" height="24" rx="4" />
        <text :x="node.x + 36" :y="node.y + 16" text-anchor="middle">
          {{ node.state }}
        </text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.fsm-live {
  margin: 0;
  inline-size: 170px;
  font-size: 0.75rem;
}
.fsm-live__edge {
  fill: none;
  stroke: var(--r-color-border);
  stroke-width: 1.5;
}
.fsm-live__edge[data-last="true"] {
  stroke: var(--r-color-brand-primary);
  stroke-width: 2.5;
}
.fsm-live__node rect {
  fill: var(--r-color-bg);
  stroke: var(--r-color-border);
}
.fsm-live__node text {
  fill: var(--r-color-fg-secondary);
  font-size: 12px;
}
.fsm-live__node[data-current="true"] rect {
  fill: var(--r-color-brand-primary);
  stroke: var(--r-color-brand-primary);
}
.fsm-live__node[data-current="true"] text {
  fill: var(--r-color-bg);
  font-weight: 600;
}
</style>
