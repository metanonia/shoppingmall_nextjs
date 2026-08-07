"use client";

import { useState } from "react";
import type { HomeSection } from "@shoppingmall/core";
import { GoodsCarousel } from "./GoodsCarousel";

// Port of main.html:304-306 / mobile_main.html:230-233's hardcoded title
// override script (keyed by section, not configurable in the admin).
const SECTION_TITLE: Record<string, string> = {
  best: "STEADY SELLER",
  reco: "MD's CHOICE",
  new: "NEW ARRIVAL",
};

export function HomeSections({
  sections,
  device,
}: {
  sections: HomeSection[];
  device: "pc" | "mobile";
}) {
  return (
    <>
      {sections.map((section, i) => {
        if (section.kind === "goods") {
          return (
            <div key={i} className={device === "mobile" ? "goodsItemGroup" : "goodsItemGroup"}>
              <h2 className={device === "pc" ? "goodsItemTitle fontSCDream weight300" : "goodsItemTitle"}>
                {SECTION_TITLE[section.key]}
              </h2>
              <GoodsCarousel
                goods={section.goods}
                displayType={section.displayType}
                device={device}
                spacer={device === "mobile" ? "empty1" : undefined}
              />
            </div>
          );
        }
        if (section.kind === "category") {
          return <CategorySection key={i} section={section} device={device} />;
        }
        return (
          <div key={i} className="mainCustomCode" dangerouslySetInnerHTML={{ __html: section.html }} />
        );
      })}
    </>
  );
}

// Port of main.html:184-294 / mobile_main.html:116-225's .categoryGoodsItem
// tab switcher — legacy toggles visibility via jQuery hover handlers keyed by
// a `data-vls` CSS-class namespace; here it's just React state.
function CategorySection({
  section,
  device,
}: {
  section: Extract<HomeSection, { kind: "category" }>;
  device: "pc" | "mobile";
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="categoryGoodsItem">
      <h2 className={device === "pc" ? "goodsItemTitle fontSCDream weight300" : "goodsItemTitle"}>
        CATEGORY BEST ITEMS
      </h2>
      <div className="alignCenter">
        {section.groups.map((group, i) => (
          <div
            key={group.cateName}
            className={`fontSCDream weight300 categoryMenu${active === i ? " hover" : ""}`}
            onMouseEnter={() => setActive(i)}
          >
            {group.cateName}
            <span className="arrow rotate225" />
          </div>
        ))}
      </div>

      {section.groups.map((group, i) => (
        <div
          key={group.cateName}
          className="cateGoodsItem"
          style={{ display: active === i ? undefined : "none" }}
        >
          <h2 className="goodsItemTitle">&nbsp;</h2>
          <GoodsCarousel
            goods={group.goods}
            displayType={group.displayType}
            device={device}
            spacer={device === "mobile" ? "empty5" : undefined}
          />
        </div>
      ))}

      {/* PC-only: .cateGoodsItem is position:absolute (style.css:505) so its
          content doesn't contribute to .categoryGoodsItem's height — main.html:270
          reserves room with this same fixed-height spacer, otherwise the absolutely
          positioned product grid overlaps whatever section comes next. Mobile's
          .cateGoodsItem is position:relative (mobile_style.css:460), so no spacer
          is needed there. */}
      {device === "pc" && <div style={{ height: 500 }} />}
    </div>
  );
}
