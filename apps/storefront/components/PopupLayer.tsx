"use client";

import { useState } from "react";
import type { PopupItem } from "@shoppingmall/core";

function setDismissCookie(uid: number): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + 1);
  document.cookie = `popup_${uid}=1; expires=${expires.toUTCString()}; path=/`;
}

// Port of lib/lib.Function.js's itsmallPopup plugin markup (`.itsmallPopup`,
// `.popup-close`, `.popup-content`, `.popup-bottom`) including image popup
// groups sharing a position. Legacy's cookie option defaults to checked.
export function PopupLayer({ popups }: { popups: PopupItem[] }) {
  const [closedUids, setClosedUids] = useState<number[]>([]);
  const [dismissChecked, setDismissChecked] = useState<Record<number, boolean>>({});
  const [slideIndexes, setSlideIndexes] = useState<Record<number, number>>({});

  function close(popup: PopupItem) {
    if (popup.type === 1 && dismissChecked[popup.uid] !== false) {
      setDismissCookie(popup.uid);
    }
    for (const slide of popup.slides) {
      if (slide.dismissForToday && dismissChecked[popup.uid] !== false) setDismissCookie(slide.uid);
    }
    setClosedUids((prev) => [...prev, popup.uid]);
  }

  const visible = popups.filter((p) => !closedUids.includes(p.uid));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((popup) => {
        const style: React.CSSProperties = { display: "block" };
        if (popup.position === 0) {
          if (popup.posTop) style.top = `${popup.posTop}px`;
          if (popup.posLeft) style.left = `${popup.posLeft}px`;
        }
        if (popup.width) style.width = `${popup.width}px`;

        const slideIndex = slideIndexes[popup.uid] ?? 0;
        const slide = popup.slides[slideIndex] ?? null;
        return (
          <div
            key={popup.uid}
            className={`itsmallPopup popup_box ${popup.position > 0 ? `position${popup.position}` : ""}`}
            style={style}
          >
            <div className="popup-close" onClick={() => close(popup)} />
            {popup.imageOnly && slide ? (
              <div className="popup-content popup-one">
                {slide.link ? (
                  <a href={slide.link}>
                    <img src={slide.imageUrl} alt={slide.name} />
                  </a>
                ) : (
                  <img src={slide.imageUrl} alt={slide.name} />
                )}
                {popup.slides.length > 1 && <div style={{ display: "flex", justifyContent: "center", gap: 8, padding: 6 }}><button type="button" onClick={() => setSlideIndexes((prev) => ({ ...prev, [popup.uid]: (slideIndex - 1 + popup.slides.length) % popup.slides.length }))}>‹</button><span>{slideIndex + 1}/{popup.slides.length}</span><button type="button" onClick={() => setSlideIndexes((prev) => ({ ...prev, [popup.uid]: (slideIndex + 1) % popup.slides.length }))}>›</button></div>}
              </div>
            ) : (
              <div className="popup-content editer" dangerouslySetInnerHTML={{ __html: popup.contentHtml ?? "" }} />
            )}
            {popup.type === 1 && (
              <div className="popup-bottom">
                오늘하루 보이지 않기{" "}
                <label>
                  <input
                    type="checkbox"
                    className="today"
                    defaultChecked
                    onChange={(e) => setDismissChecked((prev) => ({ ...prev, [popup.uid]: e.target.checked }))}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
