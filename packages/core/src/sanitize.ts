import sanitizeHtml from "sanitize-html";

// Phase 9 hardening — every rich-text field a vendor (not just admin) can
// write ends up rendered via dangerouslySetInnerHTML on the customer-facing
// storefront (product detail/description, delivery/refund/exchange/AS guide
// text). Since Phase 8 lets a vendor with goods_auth='A' publish products
// with zero admin review, an unsanitized field there is a real stored-XSS
// path, not a theoretical one. Allowlist matches what a basic rich-text
// editor produces — nowhere near enough to need <script>/<iframe>/event
// handlers, which sanitize-html strips by default regardless of allowlist.
const ALLOWED_TAGS = [
  "b", "i", "u", "strong", "em", "p", "br", "div", "span",
  "ul", "ol", "li", "a", "img", "table", "thead", "tbody", "tr", "td", "th",
  "h1", "h2", "h3", "h4", "h5", "h6",
];

export function sanitizeRichText(html: string): string {
  if (!html) return html;
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href"],
      img: ["src", "alt", "width", "height"],
      "*": ["style"],
    },
    allowedStyles: {
      "*": {
        color: [/^.*$/],
        "font-size": [/^.*$/],
        "text-align": [/^left$|^right$|^center$|^justify$/],
        "font-weight": [/^.*$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
