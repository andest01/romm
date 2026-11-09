// @ts-check
// Grep a region's job name and you find its files, so a file starts with its folder.
import { basename, dirname } from "node:path";

/** Composables have their own `use-*` role, and these predate the rule. */
const EXEMPT = [
  /^use-/,
  /\/results\/list\/(item|feel|axis-machine|axis-store|stick-driver|marks)\./,
  /\/results\/list\/scrolling\//,
];

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "A file under ui/ starts with its folder's name.",
    },
    messages: {
      missingPrefix:
        "Name this `{{folder}}.<role>` or `{{folder}}-<part>.<role>`, so grepping the folder's job finds it.",
    },
    schema: [],
  },
  create(context) {
    const path = context.filename.replaceAll("\\", "/");
    const name = basename(path);
    const folder = basename(dirname(path));
    const matches =
      folder === "ui" ||
      name.startsWith(`${folder}.`) ||
      name.startsWith(`${folder}-`) ||
      EXEMPT.some((pattern) =>
        pattern.test(pattern.source === "^use-" ? name : path),
      );
    if (matches) return {};
    return {
      /** @param {any} node */
      Program(node) {
        context.report({
          node,
          messageId: "missingPrefix",
          data: { folder },
        });
      },
    };
  },
};
