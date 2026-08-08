import type { ShoppingFeedItem } from "@shoppingmall/core";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// RSS 2.0 + Google-Shopping-style <g:*> namespace — the de-facto common
// denominator both 네이버 쇼핑EP and 다음(카카오) 쇼핑 accept, rather than two
// bespoke schemas. Legacy's naver.php/daum.php built two near-identical XML
// documents from the same query; this keeps that "same data, thin per-network
// serializer" shape without duplicating the query.
export function buildShoppingFeedXml(shopName: string, baseUrl: string, items: ShoppingFeedItem[]): string {
  const entries = items
    .map(
      (item) => `  <item>
    <g:id>${item.id}</g:id>
    <title>${escapeXml(item.title)}</title>
    <link>${baseUrl}${item.link}</link>
    <g:image_link>${baseUrl}${item.imageLink}</g:image_link>
    <g:price>${item.price} KRW</g:price>
    <g:product_type>${escapeXml(item.categoryName)}</g:product_type>
    <g:availability>in stock</g:availability>
  </item>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${escapeXml(shopName)}</title>
  <link>${baseUrl}</link>
${entries}
</channel>
</rss>
`;
}
