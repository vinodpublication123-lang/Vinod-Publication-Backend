import sanitizeHtml from "sanitize-html";

/**
 * Strip all HTML tags and attributes.
 * Use for rich-text fields that should never contain HTML.
 */
export function sanitizeText(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
}

/**
 * Allow a safe subset of rich-text HTML (bold, italic, links, lists).
 * Use for fields like fullDescription / fullBio that may carry formatted text.
 */
export function sanitizeRichText(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      "b", "i", "em", "strong", "u", "s",
      "p", "br", "ul", "ol", "li",
      "h1", "h2", "h3", "h4",
      "a", "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    // Force external links to be safe
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}
