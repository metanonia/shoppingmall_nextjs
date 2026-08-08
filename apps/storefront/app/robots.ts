import type { MetadataRoute } from "next";
import { getShopConfig } from "@shoppingmall/core";

// Port of php/sitemap.php's implicit robots policy (legacy has no dedicated
// robots.txt file, just disallows the same private/checkout-ish paths in
// practice by never linking them from crawlable pages) — this repo makes it
// explicit instead of relying on "nothing links there".
export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getShopConfig();
  const baseUrl = (config.basicUrl || process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/cart", "/order", "/order/", "/my_*", "/mypage", "/member_*", "/login", "/regist", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
