"use client";

import { useState } from "react";
import type { CategoryChip } from "@shoppingmall/core";

// Port of list.html:7-25 / mobile_list.html:8-25's `.cateList` chip row.
// Legacy shows/hides each chip's sub-category dropdown via jQuery hover/click
// handlers on `.cateSubMenu{{CATE}}`; this uses React state per chip instead.
export function CategoryChips({ chips }: { chips: CategoryChip[] }) {
  const [openCate, setOpenCate] = useState<string | null>(null);

  return (
    <div className="cateList">
      <ul>
        {chips.map((chip) => (
          <li
            key={chip.cate}
            data-cate={chip.cate}
            className={chip.selected ? "selected" : ""}
            onMouseEnter={() => chip.children.length > 0 && setOpenCate(chip.cate)}
            onMouseLeave={() => setOpenCate(null)}
          >
            <a href={`/list?cate=${chip.cate}`}>
              <div>{chip.name}</div>
            </a>
            {chip.children.length > 0 && (
              <>
                <i className="xi-angle-down-thin" />
                <div
                  className={`cateSubMenu cateSubMenu${chip.cate}`}
                  style={{ display: openCate === chip.cate ? "block" : "none" }}
                >
                  {chip.children.map((sub) => (
                    <a key={sub.cate} href={`/list?cate=${sub.cate}`} className={sub.selected ? "selected" : ""}>
                      <div>{sub.name}</div>
                    </a>
                  ))}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
