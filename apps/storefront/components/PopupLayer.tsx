"use client";

import { useState } from "react";
import type { PopupItem } from "@shoppingmall/core";

// Port of lib/lib.Function.js's itsmallPopup plugin markup (`.itsmallPopup`,
// `.popup-close`, `.popup-content`, `.popup-bottom`). The "여러 이미지 팝업을
// 슬라이더로 합치기" behavior isn't reproduced — each popup floats
// independently, see popup.ts / MIGRATION.md. Legacy's cookie option
// defaults to checked (dismiss unless unchecked); this keeps that default.
export function PopupLayer({ popups }: { popups: PopupItem[] }) {
  const [closedUids, setClosedUids] = useState<number[]>([]);
  const [dismissChecked, setDismissChecked] = useState<Record<number, boolean>>({});

  function close(popup: PopupItem) {
    if (popup.type === 1 && dismissChecked[popup.uid] !== false) {
      const oneDay = 24 * 60 * 60 * 1000;
      document.cookie = `popup_${popup.uid}=1; expires=${new Date(Date.now() + oneDay).toUTCString()}; path=/`;
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

        return (
          <div
            key={popup.uid}
            className={`itsmallPopup popup_box ${popup.position > 0 ? `position${popup.position}` : ""}`}
            style={style}
          >
            <div className="popup-close" onClick={() => close(popup)} />
            {popup.imageOnly ? (
              <div className="popup-content popup-one">
                {popup.link ? (
                  <a href={popup.link}>
                    <img src={popup.imageUrl ?? ""} alt={popup.name} />
                  </a>
                ) : (
                  <img src={popup.imageUrl ?? ""} alt={popup.name} />
                )}
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
