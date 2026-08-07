"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import type { BannerItem, CategoryNavItem, MemberProfile, TopMenuItem } from "@shoppingmall/core";
import { SearchBox } from "./SearchBox";
import "swiper/css";

// Port of skin/seriesWhite/mobile_top.html. Legacy drives the #topMenu /
// #topSearch slide-out panels via hash-based navigation (mobile_shop.js
// listens for `hashchange` on `#topMenu`/`#topSearch`); here they're just
// React state, which is simpler and doesn't hijack the browser back button
// the way the original hash trick does.
export function TopNavMobile({
  logo,
  topMenu,
  categories,
  compTel,
  member,
}: {
  logo: BannerItem[];
  topMenu: TopMenuItem[];
  categories: CategoryNavItem[];
  compTel: string;
  member: MemberProfile | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* mobile_style.css:362-370: #topUtil and #topContent are both
          position:fixed (a persistent header), so they take up no space in
          normal flow. mobile_top.html reserves the equivalent space with
          these two spacers immediately before/between them — without them,
          real page content starts at y=0 and renders underneath the opaque
          fixed header instead of below it. */}
      <div className="empty40" />
      <div id="topUtil">
        <div className="logo">
          {logo.map((b) => (
            <h1 key={b.uid}>
              <a href={b.link}>
                <img src={b.imageUrl} alt="" />
              </a>
            </h1>
          ))}
        </div>
        <div className="icon">
          <a href="#topMenu" className="btnTopMenu topMenuView" onClick={(e) => { e.preventDefault(); setMenuOpen(true); }}>
            <i className="xi-bars xi-x" />
          </a>
          <a href="#topSearch" className="btnTopSearch" onClick={(e) => { e.preventDefault(); setSearchOpen(true); }}>
            <i className="xi-search xi-x" />
          </a>
          &nbsp;
          <a href="/cart">
            <i className="xi-market xi-x btnTopCart">
              <span className="cart_cnt" />
            </i>
          </a>
        </div>
      </div>

      <div className="empty50 topContentEmpty" />
      <div id="topContent">
        <div className="topNavis">
          <div className="swiper-container">
            <Swiper modules={[FreeMode]} freeMode slidesPerView="auto" roundLengths>
              {topMenu.map((item) => (
                <SwiperSlide key={item.label}>
                  <a href={item.url}>{item.label}</a>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div id="topSearch" style={{ display: "block" }}>
          <div className="topSearchClose" onClick={() => setSearchOpen(false)}>
            <i className="xi-close-thin xi-2x" />
          </div>
          <SearchBox variant="mobile" />
        </div>
      )}

      {menuOpen && (
        <div id="topMenu" style={{ display: "block" }}>
          <div className="header">
            <div className="title">
              {member ? (
                <span>{member.name}님, 안녕하세요!</span>
              ) : (
                <a href="/login">
                  <b className="underLineThinSelectedW">로그인</b>을 해 주세요.
                </a>
              )}
              <span className="topMenuClose" onClick={() => setMenuOpen(false)}>
                <i className="xi-close-thin xi-x" />
              </span>
            </div>
            <div className="menu">
              <ul>
                <li>
                  <a href="/mypage">
                    <i className="xi-user-o xi-x" /> 마이페이지
                  </a>
                </li>
                <li>
                  <a href="/cart">
                    <i className="xi-market xi-x" /> 장바구니
                  </a>
                </li>
                <li>
                  <a href="/order_list">
                    <i className="xi-box xi-x" /> 주문배송조회
                  </a>
                </li>
                <li>
                  <a href="/cs_center">
                    <i className="xi-headset xi-x" /> 고객센터
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="item">
            <div className="empty20" />
            <div className="category">
              <div>카테고리</div>
              <div className="empty10" />
              <ul>
                {categories.map((cate) => (
                  <li key={cate.cate}>
                    <a href={`/list?cate=${cate.cate}`}>{cate.name}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="empty20" />
            <div className="line" />
            <div className="empty20" />

            <div className="cs">
              <div>
                고객센터 <span>{compTel}</span>
              </div>
              <div className="empty20" />
              <ul>
                <li>
                  <a href="/">
                    <i className="xi-home-o xi-x" /> 메인페이지
                  </a>
                </li>
                <li>
                  <a href="/cs_board?b_id=notice">
                    <i className="xi-info-o xi-x" /> 공지사항
                  </a>
                </li>
                <li>
                  <a href="/cs_board?b_id=faq">
                    <i className="xi-forum-o xi-x" /> 자주 찾는 질문
                  </a>
                </li>
                <li>
                  <a href="/review">
                    <i className="xi-paper-o xi-x" /> 구매후기
                  </a>
                </li>
                <li>
                  <a href="/cs_board?b_id=counsel">
                    <i className="xi-border-color xi-x" /> 1:1 문의
                  </a>
                </li>
                {member ? (
                  <li>
                    <a href="/logout">
                      <i className="xi-log-out xi-x" /> 로그아웃
                    </a>
                  </li>
                ) : (
                  <li>
                    <a href="/regist">
                      <i className="xi-user-plus-o xi-x" /> 회원가입
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
