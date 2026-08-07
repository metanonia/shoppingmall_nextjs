"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import type { GoodsCardViewModel } from "@shoppingmall/core";
import type { GoodsDisplayType } from "@shoppingmall/core";
import { GoodsCard } from "./GoodsCard";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// Port of the swiper init scripts repeated per goods section in
// main.html:146-181 / mobile_main.html:78-113: type1/type1_group render a
// Swiper carousel (grouped by 4 on PC, 2 on mobile, when type1_group);
// type0 renders a plain static row — legacy achieves this by stripping the
// swiper-slide/swiper-wrapper classes with jQuery after the fact, we just
// branch the markup instead.
export function GoodsCarousel({
  goods,
  displayType,
  device,
  spacer,
}: {
  goods: GoodsCardViewModel[];
  displayType: GoodsDisplayType;
  device: "pc" | "mobile";
  spacer?: string;
}) {
  const [nextEl, setNextEl] = useState<HTMLDivElement | null>(null);
  const [prevEl, setPrevEl] = useState<HTMLDivElement | null>(null);

  if (displayType === "type0") {
    return (
      <div className={device === "mobile" ? "goodsItemBox2Wrap" : "goodsItemBoxWrap"}>
        {goods.map((g) => (
          <div key={g.uid} className={device === "mobile" ? "goodsItemBox2" : "goodsItemBox"}>
            <GoodsCard goods={g} spacer={spacer} />
          </div>
        ))}
      </div>
    );
  }

  const slidesPerView = device === "mobile" ? 2 : 4;
  const slidesPerGroup = displayType === "type1_group" ? slidesPerView : 1;
  const loop = goods.length > slidesPerView;

  return (
    <div className="swiper-container">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop={loop}
        slidesPerView={slidesPerView}
        slidesPerGroup={slidesPerGroup}
        spaceBetween={device === "mobile" ? 0 : 15}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
        navigation={device === "mobile" ? false : { nextEl, prevEl }}
        pagination={device === "mobile" ? { clickable: true } : false}
      >
        {goods.map((g) => (
          <SwiperSlide key={g.uid} className="goodsItemBox">
            <GoodsCard goods={g} spacer={spacer} />
          </SwiperSlide>
        ))}
      </Swiper>
      {device !== "mobile" && (
        <>
          <div
            ref={setNextEl}
            className="swiper-button-next circleBtn swiper-button-main"
            style={{ right: -14, width: 35, height: 40, color: "#fff", padding: "0 0 0 5px" }}
          >
            <i className="xi-angle-right-thin xi-x" />
          </div>
          <div
            ref={setPrevEl}
            className="swiper-button-prev circleBtn swiper-button-main"
            style={{ left: -20, width: 35, height: 40, color: "#fff", padding: "0 5px 0 0" }}
          >
            <i className="xi-angle-left-thin xi-x" />
          </div>
        </>
      )}
    </div>
  );
}
