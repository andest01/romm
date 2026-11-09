// @ts-check
// Landmarks are structure, and structure belongs to layouts.

const SCOPED_AWAY = new Set(["header", "footer"]);
const LANDMARK_TAGS = new Set(["aside", "main", "nav", "section"]);
const LANDMARK_ROLES = new Set([
  "banner",
  "complementary",
  "contentinfo",
  "main",
  "navigation",
  "region",
  "search",
]);

/**
 * The attribute `name`, written plainly or bound with `:name`.
 * @param {any} element
 * @param {string} name
 */
function findAttribute(element, name) {
  return element.startTag.attributes.find(
    (/** @type {any} */ attribute) =>
      (!attribute.directive && attribute.key.name === name) ||
      (attribute.directive &&
        attribute.key.name.name === "bind" &&
        attribute.key.argument?.name === name),
  );
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Only a *.pure-layout.vue declares landmarks, each named by a visible heading.",
    },
    messages: {
      scopedAway:
        "<{{name}}> inside <main> is not a landmark. Use a div, or a named <section> in a layout.",
      onlyLayouts:
        "Only a *.pure-layout.vue may declare a landmark. Render a div here and let the layout own the region.",
      needsLabelledBy:
        "Name this landmark with aria-labelledby, pointing at a heading part, so the spoken and visible names can't disagree.",
    },
    schema: [],
  },
  create(context) {
    const isLayout = context.filename.endsWith(".pure-layout.vue");
    const visitor = /** @type {any} */ (context.sourceCode.parserServices)
      .defineTemplateBodyVisitor;
    if (!visitor) return {};
    return visitor({
      /** @param {any} node */
      VElement(node) {
        if (SCOPED_AWAY.has(node.rawName)) {
          context.report({
            node: node.startTag,
            messageId: "scopedAway",
            data: { name: node.rawName },
          });
          return;
        }
        const role = findAttribute(node, "role")?.value?.value;
        if (!LANDMARK_TAGS.has(node.rawName) && !LANDMARK_ROLES.has(role)) {
          return;
        }
        if (!isLayout) {
          context.report({ node: node.startTag, messageId: "onlyLayouts" });
          return;
        }
        if (
          findAttribute(node, "aria-label") ||
          !findAttribute(node, "aria-labelledby")
        ) {
          context.report({ node: node.startTag, messageId: "needsLabelledBy" });
        }
      },
    });
  },
};
