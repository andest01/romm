// Pulls in md-editor's renderer and stylesheet, so import it lazily. Kept apart
// from markdownEditor.ts so a preview never downloads CodeMirror.
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { type Component, type FunctionalComponent, h } from "vue";
import { headingId } from "./markdownHeadingId";
import { withoutCdn } from "./markdownNoCdn";

const Preview: Component = withoutCdn(MdPreview);

// md-editor's default heading id is the raw text, spaces included, which is not
// a valid id and breaks in-page anchors.
const PreviewWithAnchors: FunctionalComponent = (_, { attrs, slots }) =>
  h(Preview, { mdHeadingId: headingId, ...attrs }, slots);

export default PreviewWithAnchors;
