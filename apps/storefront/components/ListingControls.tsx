"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { SortOption } from "@shoppingmall/core";

// Port of list.html:118-156 / mobile_list.html's sort/limit selects and the
// "결과 내 검색" (search-within-results) input. Legacy submits a real <form>
// GET and also wires an AJAX shortcut (listProc.js); this just pushes a new
// URL with updated search params, which re-runs the Server Component query —
// no client-side fetch/JSON endpoint needed.
export function ListingControls({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div className="listTopTitle fontSCDream">
        전체 <b id="listTotal">{total.toLocaleString("en-US")}</b>
      </div>
      <div className="listTopSelect">
        <div className="floatLeft" style={{ padding: "0 10px" }}>
          <select
            name="sort"
            defaultValue={(searchParams.get("sort") as SortOption) ?? "best"}
            onChange={(e) => updateParam("sort", e.target.value)}
          >
            <option value="best">인기순</option>
            <option value="new">최신순</option>
            <option value="price_asc">가격낮은순</option>
            <option value="price_desc">가격높은순</option>
          </select>
        </div>
        <div className="floatLeft">
          <select
            name="limit"
            defaultValue={searchParams.get("limit") ?? "12"}
            onChange={(e) => updateParam("limit", e.target.value)}
          >
            <option value="12">12개 보기</option>
            <option value="24">24개 보기</option>
            <option value="48">48개 보기</option>
            <option value="96">96개 보기</option>
          </select>
        </div>
        <div className="floatLeft positionRelative" style={{ paddingLeft: 10 }}>
          <input
            type="text"
            name="keyword"
            className="search"
            placeholder="결과 내 검색"
            autoComplete="off"
            defaultValue={searchParams.get("keyword") ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParam("keyword", e.currentTarget.value);
            }}
          />
        </div>
      </div>
    </div>
  );
}
