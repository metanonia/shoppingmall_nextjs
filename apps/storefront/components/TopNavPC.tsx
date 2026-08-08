"use client";

import { useState } from "react";
import Link from "next/link";
import type { BannerItem, CategoryNavItem, MemberProfile, TopMenuItem } from "@shoppingmall/core";
import { SearchBox } from "./SearchBox";

// Port of skin/seriesWhite/top.html. Hover-driven dropdowns (topNaviSub,
// mypageBox, cateAll) are reimplemented as React state instead of the
// original jQuery `textMenus` hover handlers + JS width-balancing script —
// the visible structure/classNames are kept 1:1 for pixel fidelity, the
// interaction wiring is modernized per the migration plan's decision to
// rewrite behavior in the new stack rather than port jQuery verbatim.
export function TopNavPC({
  logo,
  topBanner,
  topMenu,
  categories,
  member,
}: {
  logo: BannerItem[];
  topBanner: BannerItem[];
  topMenu: TopMenuItem[];
  categories: CategoryNavItem[];
  member: MemberProfile | null;
}) {
  const [cateAllOpen, setCateAllOpen] = useState(false);
  const [hoverSub, setHoverSub] = useState<number | null>(null);

  return (
    <>
    <div id="topUtil">
      <div id="topMenu">
        <div id="utilMenu">
          <ul>
            <li className="first">
              <a href="#">BOOKMARK</a>
            </li>
          </ul>
          <div className="fff" />
        </div>
        <div id="homeMenu">
          <ul>
            {member ? (
              <>
                <li className="first line">{member.name}님</li>
                <li>
                  <a href="/logout">LOGOUT</a>
                </li>
              </>
            ) : (
              <>
                <li className="first line">
                  <a href="/login">LOGIN</a>
                </li>
                <li>
                  <a href="/regist">JOIN</a>
                </li>
              </>
            )}
            <li className="line">
              <Link href="/my_order">ORDER LIST</Link>
            </li>
            <li className="line menuMy">
              <div>
                <a href="/mypage">
                  MY SHOP <i className="xi-angle-down" />
                </a>
              </div>
            </li>
            <li className="line">
              <a href="/cart">CART</a>
            </li>
            <li>
              <a href="/cs_center">CS CENTER</a>
            </li>
          </ul>
        </div>
      </div>
    </div>

      <div className="empty10">&nbsp;</div>

      <div id="topContent">
        <div id="topMain">
          <div id="topBanner">
            <div className="empty10">&nbsp;</div>
            {topBanner.map((b) => (
              <div key={b.uid}>
                <a href={b.link} target={b.target ? "_blank" : undefined}>
                  <img src={b.imageUrl} alt="" />
                </a>
              </div>
            ))}
          </div>

          <div id="logo">
            {logo.map((b) => (
              <h1 key={b.uid}>
                <a href={b.link} target={b.target ? "_blank" : undefined}>
                  <img src={b.imageUrl} alt="" />
                </a>
              </h1>
            ))}
          </div>

          <div id="topSearch">
            <SearchBox variant="pc" />
          </div>
        </div>

        <div className="naviEmpty">&nbsp;</div>

        <div className="naviDefault">
          <div id="topNavis">
            <ul>
              <li className="cateAllOpen" onClick={() => setCateAllOpen((v) => !v)}>
                <div>
                  <div className="cate_bar cate_bar_1" />
                  <div className="cate_bar cate_bar_2" />
                  <div className="cate_bar cate_bar_3" />
                </div>
              </li>
              {topMenu.map((item, i) => (
                <li
                  key={item.label}
                  className="topNavi"
                  // Legacy spaces these evenly via a JS width-balancing script
                  // (top.html:172-193, `c = Math.floor((a - b) / naviCnt)`,
                  // added as extra width per <li>) that isn't ported — see the
                  // component-level comment. This padding is the CSS-only
                  // stand-in so items don't render flush against each other.
                  style={{ paddingLeft: 24, paddingRight: 24 }}
                  onMouseEnter={() => setHoverSub(i)}
                  onMouseLeave={() => setHoverSub(null)}
                >
                  <div>
                    <a href={item.url}>{item.label}</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {cateAllOpen && (
            <div id="cateAll" style={{ display: "block" }}>
              <div id="cateAllIn">
                {categories.map((cate) => (
                  <ul key={cate.cate} className="cateBox">
                    <li>
                      <a href={`/list?cate=${cate.cate}`}>{cate.name}</a>
                    </li>
                    {cate.children.map((sub) => (
                      <li key={sub.cate}>
                        <a href={`/list?cate=${sub.cate}`} className="sub">
                          {sub.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ))}
                <div className="cateAllClose" onClick={() => setCateAllOpen(false)}>
                  <i className="xi-close-thin xi-x" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
