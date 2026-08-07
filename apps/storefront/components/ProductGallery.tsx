"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// Port of view.html:16-58 / mobile_view.html:22-58's `.goodsImage` gallery.
// Legacy only shows nav arrows when there's more than one image
// (`is_image_swiper`); pinch-zoom (mobile_view.html's pinch-zoom.js) isn't
// ported — a plain swipeable gallery covers the browsing need.
export function ProductGallery({ images, name, device }: { images: string[]; name: string; device: "pc" | "mobile" }) {
  const multiple = images.length > 1;

  return (
    <div className="goodsImage">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop={multiple && device === "pc"}
        navigation={multiple && device === "pc"}
        pagination={multiple ? { clickable: true } : false}
        autoplay={multiple ? { delay: 3500, disableOnInteraction: false } : false}
      >
        {images.map((src, i) => (
          <SwiperSlide key={src + i}>
            <img src={src} title={name} alt={name} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
