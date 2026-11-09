// Stearch's own lint rules, spread into frontend/eslint.config.js. Paths are
// relative to frontend/, where the root config lives.
import landmarks from "./eslint-rules/landmarks.js";
import noVisualReorder from "./eslint-rules/no-visual-reorder.js";
import pureLayoutParts from "./eslint-rules/pure-layout-parts.js";

const STEARCH = "src/components/Stearch";

/** Rules only Stearch needs, as a local plugin. */
const stearchPlugin = {
  meta: { name: "stearch" },
  rules: {
    landmarks,
    "no-visual-reorder": noVisualReorder,
    "pure-layout-parts": pureLayoutParts,
  },
};

const UP_ONLY =
  "Selectors and their types reach up the tree or across to peers, never down: move what's shared up to where both sides can import it.";

export default [
  // Selector imports flow from the trunk out to the leaves, never back.
  {
    files: [`${STEARCH}/**/*.ts`],
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: `./${STEARCH}/store/stearch.selectors.ts`,
              from: `./${STEARCH}`,
              except: ["./store/stearch.state-props.ts"],
              message:
                "The trunk reads state only. It imports nothing else from Stearch.",
            },
            {
              target: `./${STEARCH}/store/*.selectors.ts`,
              from: `./${STEARCH}/!(store)/**`,
              message: UP_ONLY,
            },
            {
              target: `./${STEARCH}/ui/*/*.selectors.ts`,
              from: `./${STEARCH}/ui/*/*/**`,
              message: UP_ONLY,
            },
            {
              target: `./${STEARCH}/ui/*/*/*.selectors.ts`,
              from: `./${STEARCH}/ui/*/*/*/**`,
              message: UP_ONLY,
            },
          ],
        },
      ],
    },
  },
  {
    files: [`${STEARCH}/**/*.pure-layout.vue`],
    plugins: { stearch: stearchPlugin },
    rules: {
      "stearch/pure-layout-parts": "error",
      "stearch/no-visual-reorder": "error",
    },
  },
  // Navigation and accessibility: the structure is checked, not reviewed.
  {
    files: [`${STEARCH}/**/*.vue`],
    plugins: { stearch: stearchPlugin },
    rules: {
      "stearch/landmarks": "error",
      "vuejs-accessibility/no-aria-hidden-on-focusable": "error",
      "vuejs-accessibility/no-role-presentation-on-focusable": "error",
    },
  },
  // Pure means pure: props in, events out. State lives in containers and the store.
  {
    files: [
      `${STEARCH}/**/*.pure-component.vue`,
      `${STEARCH}/**/*.pure-layout.vue`,
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "vue",
              importNames: [
                "ref",
                "shallowRef",
                "reactive",
                "computed",
                "watch",
                "watchEffect",
                "inject",
                "onMounted",
                "onBeforeUnmount",
              ],
              message:
                "Pure components have no state. Move it to the store and pass it down through a container.",
            },
            {
              name: "pinia",
              message:
                "Pure components have no state. Connect it in the container.",
            },
          ],
          patterns: [
            {
              group: ["@/stores/*", "**/*.store", "@/composables/*"],
              message:
                "Pure components have no state. Connect it in the container.",
            },
          ],
        },
      ],
    },
  },
  // The trunk: only stearch.selectors.ts (and the reducer and store that write
  // state) may read IStearchState's branches. Everything else goes through it.
  {
    files: [`${STEARCH}/**/*.{ts,vue}`],
    ignores: [
      `${STEARCH}/store/stearch.selectors.ts`,
      `${STEARCH}/store/stearch.reducer.ts`,
      `${STEARCH}/store/stearch.store.ts`,
      `${STEARCH}/store/fixtures.ts`,
      `${STEARCH}/**/*.test.ts`,
      `${STEARCH}/**/*.stories.ts`,
      `${STEARCH}/**/*.fixtures.ts`,
      `${STEARCH}/**/*.story-args.ts`,
    ],
    rules: {
      // Repeats the repo-wide entries: a later block replaces the whole rule.
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='focus']",
          message:
            "Focus through focusFromInput from @/utils/autofocus, so keyboard and gamepad moves show the focus ring.",
        },
        {
          selector:
            "CallExpression[callee.object.name='emitter'][callee.property.name='on']",
          message:
            "Subscribe with useEmitterEvent from @/composables/useEmitterEvent, which unsubscribes when the component unmounts.",
        },
        {
          selector:
            "CallExpression[callee.name=/^(watch|watchEffect|watchPostEffect|watchSyncEffect)$/] CallExpression[callee.property.name='dispatch']",
          message:
            "State changes come from events, never from watchers: a watcher that dispatches can feed back into itself. Keep screen facts view-only (see content/content.view.ts).",
        },
        {
          selector:
            "MemberExpression[property.name=/^(query|view|results|attention|labels)$/]:matches([object.name='state'], [object.property.name='state'])",
          message:
            "Read state through a selector in store/stearch.selectors.ts, the only file that touches IStearchState.",
        },
      ],
    },
  },
];
