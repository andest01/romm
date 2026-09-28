// Accessibility violations already known and not yet fixed. The scan in
// a11y.spec.ts ignores a violation only when its element is inside `selector`
// and the rule matches. Fix one, then delete its entry: this list only shrinks.

/** Rules that still run and are reported in each test's annotations, but
 *  don't fail it. color-contrast: the palette is pending a design discussion. */
export const REPORT_ONLY_A11Y_RULES: readonly string[] = ["color-contrast"];

export interface KnownA11yViolation {
  rule: string;
  /** A stable CSS selector for the element or its ancestor, never an id from data. */
  selector: string;
  reason: string;
}

export const KNOWN_A11Y_VIOLATIONS: readonly KnownA11yViolation[] = [
  {
    rule: "page-has-heading-one",
    selector: "html",
    reason:
      "Login and home have no h1. Needs a visually-hidden primitive, which v2 lacks.",
  },
  {
    rule: "image-redundant-alt",
    selector: ".game-cover",
    reason:
      "The cover's alt repeats the card link's name; part of the GameCard link refactor.",
  },
  {
    rule: "heading-order",
    selector: ".overview-tab__section-head",
    reason: "Overview section heads jump to h4.",
  },
  {
    rule: "scrollable-region-focusable",
    selector: ".r-v2-manual",
    reason:
      "A manual with no focusable content scrolls, but can't be reached by keyboard.",
  },
  {
    rule: "region",
    selector: ".r-tooltip",
    reason:
      "RTooltip teleports to <body>, outside any landmark; it shows on gamepad devices, where focus lands on load.",
  },
];
