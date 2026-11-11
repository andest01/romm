// @ts-check
// A pure layout places parts, so its props must hold at least two of them.

const MIN_PARTS = 2;
const PART = /\bComponent\b/;

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description: `A *.pure-layout.vue takes at least ${MIN_PARTS} Component props.`,
    },
    messages: {
      tooFewParts:
        "A pure layout places parts: give it at least {{min}} `Component` props (found {{found}}). Otherwise it's a pure component.",
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    if (!services?.program || !services.esTreeNodeToTSNodeMap) return {};
    const checker = services.program.getTypeChecker();

    return {
      /** @param {any} node */
      "CallExpression[callee.name='defineProps']"(node) {
        const typeNode = node.typeArguments?.params?.[0];
        if (!typeNode) return;
        const type = checker.getTypeAtLocation(
          services.esTreeNodeToTSNodeMap.get(typeNode),
        );
        const found = checker.getPropertiesOfType(type).filter((property) => {
          const declaration = property.declarations?.[0];
          const annotation =
            declaration && "type" in declaration ? declaration.type : null;
          return Boolean(
            annotation &&
            typeof annotation === "object" &&
            "getText" in annotation &&
            PART.test(annotation.getText()),
          );
        }).length;
        if (found < MIN_PARTS) {
          context.report({
            node,
            messageId: "tooFewParts",
            data: { min: String(MIN_PARTS), found: String(found) },
          });
        }
      },
    };
  },
};
