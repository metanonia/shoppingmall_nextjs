"use client";

import Script from "next/script";
import { useState, type RefObject } from "react";

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void }) => {
        open: () => void;
      };
    };
  }
}

// Backoffice twin of apps/storefront/components/PostcodeSearchButton.tsx —
// same free Daum postcode widget, no API key needed. Kept as a separate
// small component per-app rather than a shared package, matching this
// repo's existing convention (each app owns its own component tree).
export function PostcodeSearchButton({
  postcodeRef,
  address1Ref,
  address2Ref,
}: {
  postcodeRef: RefObject<HTMLInputElement | null>;
  address1Ref: RefObject<HTMLInputElement | null>;
  address2Ref?: RefObject<HTMLInputElement | null>;
}) {
  const [ready, setReady] = useState(false);

  function open() {
    if (!window.daum) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        if (postcodeRef.current) postcodeRef.current.value = data.zonecode;
        if (address1Ref.current) address1Ref.current.value = data.roadAddress || data.jibunAddress;
        address2Ref?.current?.focus();
      },
    }).open();
  }

  return (
    <>
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" onReady={() => setReady(true)} />
      <button type="button" onClick={open} disabled={!ready}>
        우편번호 검색
      </button>
    </>
  );
}
