"use client";

import { useEffect, useRef, useState } from "react";
import { clearRecentKeywords, getAutocomplete, getSearchDropdownData } from "@/lib/search-actions";

// Port of skin/seriesWhite/top.html:82-116's #topSearch/#searchResent
// dropdown (최근 검색어 + 추천 검색어) and the `.topKeyword` autocomplete
// plugin (shop.js). Simplifications (see MIGRATION.md): no per-item delete
// icon (only "초기화" clear-all), and autocomplete suggests from search
// history (mallRN_keyword_search) rather than the jamo-decomposed
// mallRN_keyword_autocomplete pipeline.
// variant="mobile" skips the outer `#topSearch` wrapper (mobile_top.html's
// full-screen overlay panel already supplies its own `#topSearch` div —
// see TopNavMobile.tsx) and renders a plain input without the search icon
// button, matching mobile_top.html's simpler markup.
export function SearchBox({ variant = "pc" }: { variant?: "pc" | "mobile" }) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function openDropdown() {
    setOpen(true);
    if (!keyword) {
      const data = await getSearchDropdownData();
      setRecent(data.recent);
      setPopular(data.popular);
    }
  }

  function onChange(value: string) {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestions(await getAutocomplete(value));
    }, 200);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ display: "contents" }}>
      <div id="searchKeyword">
        <form action="/search" method="get">
          <div className="floatLeft">
            <input
              type="text"
              name="keyword"
              className="topKeyword fontSCDream size14"
              autoComplete="off"
              placeholder={variant === "pc" ? "검색어를 입력하세요" : undefined}
              value={keyword}
              onFocus={openDropdown}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
          <div className="floatLeft" style={{ padding: "6px 0 0" }}>
            <button type="submit" aria-label="검색" style={{ background: "none", border: 0 }}>
              <i className="xi-search size14 cursorPoint" />
            </button>
          </div>
        </form>
      </div>

      {open && (
        <div id="searchResent" style={{ display: "block" }}>
          {keyword && suggestions.length > 0 ? (
            <div className="recent">
              {suggestions.map((s) => (
                <span className="recentItem" key={s}>
                  <a href={`/search?keyword=${encodeURIComponent(s)}`}>{s}</a>
                </span>
              ))}
            </div>
          ) : (
            <>
              <div className="recent">
                <span className="fontSCDream size13 weight400">최근 검색어</span>
                <span
                  className="fontSCDream size11 colorLgray cursorPoint underLineThin"
                  onClick={async () => {
                    await clearRecentKeywords();
                    setRecent([]);
                  }}
                >
                  초기화
                </span>
                <div className="empty10">&nbsp;</div>
                {recent.length === 0 ? (
                  <div id="recentKeywordEmpty" className="fontSCDream size11 colorLgray">
                    최근 검색어가 없습니다.
                  </div>
                ) : (
                  recent.map((k) => (
                    <span className="recentItem" key={k}>
                      <a href={`/search?keyword=${encodeURIComponent(k)}`}>{k}</a>
                    </span>
                  ))
                )}
              </div>
              <div className="empty10">&nbsp;</div>
              <div className="line">&nbsp;</div>
              <div className="ranking">
                <span className="fontSCDream size13 weight400">추천 검색어</span>
                <div className="empty5">&nbsp;</div>
                {popular.map((k) => (
                  <span key={k}>
                    <a href={`/search?keyword=${encodeURIComponent(k)}`}># {k}</a>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
