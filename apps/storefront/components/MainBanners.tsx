"use client";

import type { BannerItem } from "@shoppingmall/core";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// Port of main.html:1-44 (PC: #mainRolling, background-image slides) and
// mobile_main.html:1-33 (mobile: same #mainRolling, plain <img> slides, no
// nav arrows — pagination dots only).
export function MainRollingBanner({ banners, device }: { banners: BannerItem[]; device: "pc" | "mobile" }) {
  if (banners.length === 0) return null;

  return (
    <div id="mainRolling">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop
        navigation={device === "pc"}
        pagination={{ clickable: true }}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
      >
        {banners.map((b) =>
          device === "pc" ? (
            <SwiperSlide key={b.uid}>
              <a href={b.link} target={b.target ? "_blank" : undefined} rel={b.target ? "noreferrer" : undefined}>
                <div style={{ backgroundImage: `url(${b.imageUrl})` }}>&nbsp;</div>
              </a>
            </SwiperSlide>
          ) : (
            <SwiperSlide key={b.uid}>
              <a href={b.link} target={b.target ? "_blank" : undefined} rel={b.target ? "noreferrer" : undefined}>
                <img src={b.imageUrl} alt="" />
              </a>
            </SwiperSlide>
          ),
        )}
      </Swiper>
    </div>
  );
}

// Port of main.html:48-103's .mainBannerCenter block (MAINCL swiper + MAINCR
// static stack). PC-only — mobile_main.html has no equivalent section.
export function MainBannerCenter({ mainCL, mainCR }: { mainCL: BannerItem[]; mainCR: BannerItem[] }) {
  if (mainCL.length === 0 && mainCR.length === 0) return null;

  return (
    <div className="mainBannerCenter">
      {mainCL.length > 0 && (
        <div className="mainBannerCenterL">
          <Swiper
            modules={[Navigation, Pagination, Autoplay]}
            loop
            navigation
            pagination={{ clickable: true }}
            autoplay={{ delay: 3500, disableOnInteraction: false }}
          >
            {mainCL.map((b) => (
              <SwiperSlide key={b.uid}>
                <a href={b.link} target={b.target ? "_blank" : undefined} rel={b.target ? "noreferrer" : undefined}>
                  <img src={b.imageUrl} alt="" />
                </a>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
      {mainCR.length > 0 && (
        <div className="mainBannerCenterR">
          <div className="mainBannerCenterRIn">
            {mainCR.map((b) => (
              <div key={b.uid}>
                <a href={b.link} target={b.target ? "_blank" : undefined} rel={b.target ? "noreferrer" : undefined}>
                  <img src={b.imageUrl} alt="" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
