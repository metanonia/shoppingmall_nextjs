"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function VisitTracker() {
  const pathname = usePathname(); const search = useSearchParams();
  useEffect(() => { const query = search.toString(); void fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: `${pathname}${query ? `?${query}` : ""}`, referer: document.referrer }), keepalive: true }); }, [pathname, search]);
  return null;
}
