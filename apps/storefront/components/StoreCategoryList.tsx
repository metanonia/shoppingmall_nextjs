"use client";

import { useState } from "react";
import type { StoreCategoryCount } from "@shoppingmall/core";

// Port of store.html:171-189's `.cateList` chip row — same as CategoryChips
// but each item shows a product count and links to /store instead of /list.
export function StoreCategoryList({ vendorId, categories, selectedCate }: { vendorId: string; categories: StoreCategoryCount[]; selectedCate?: string }) {
  const [openCate, setOpenCate] = useState<string | null>(null);

  return (
    <div className="cateList">
      <ul>
        {categories.map((cate) => (
          <li
            key={cate.cate}
            data-cate={cate.cate}
            className={cate.cate === selectedCate ? "selected" : ""}
            onMouseEnter={() => cate.children.length > 0 && setOpenCate(cate.cate)}
            onMouseLeave={() => setOpenCate(null)}
          >
            <a href={`/store?vendor=${vendorId}&cate=${cate.cate}`}>
              <div>
                {cate.name} <span>{cate.count}</span>
              </div>
            </a>
            {cate.children.length > 0 && (
              <>
                <i className="xi-angle-down-thin" />
                <div
                  className={`cateSubMenu cateSubMenu${cate.cate}`}
                  style={{ display: openCate === cate.cate ? "block" : "none" }}
                >
                  {cate.children.map((sub) => (
                    <a
                      key={sub.cate}
                      href={`/store?vendor=${vendorId}&cate=${sub.cate}`}
                      className={sub.cate === selectedCate ? "selected" : ""}
                    >
                      <div>
                        {sub.name} <span>{sub.count}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {/* See CategoryChips.tsx's comment: `.cateList .line` is a clearfix
          mobile_style.css already defines but no skin HTML file uses, so the
          float-only `.cateList` collapses to 0 height on mobile without it. */}
      <div className="line" />
    </div>
  );
}
