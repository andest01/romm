// Turns an element drawn in a scratch page into report attachments: an image
// shown inline, and the same markup as a standalone page with its tooltips.
import type { Locator } from "@playwright/test";

/** Wraps drawn markup as a standalone page; its styles are all inline. */
export function standaloneHtml(title: string, body: string): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="margin:0;background:#000">${body}</body>`;
}

/** Screenshots the element as WebP. Playwright only writes PNG or JPEG, so the
 *  page's canvas re-encodes it; past WebP's 16383px limit it stays PNG. */
export async function webpShot(
  element: Locator,
): Promise<{ body: Buffer; contentType: string }> {
  const png = await element.screenshot();
  const dataUrl = await element.page().evaluate(async (base64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    return canvas.toDataURL("image/webp", 0.75);
  }, png.toString("base64"));
  return dataUrl.startsWith("data:image/webp")
    ? {
        body: Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"),
        contentType: "image/webp",
      }
    : { body: png, contentType: "image/png" };
}
