"use client";

import { useState } from "react";
import type { GoodsCardViewModel } from "@shoppingmall/core";

export function RecentQuickMenu({ goods }: { goods: GoodsCardViewModel[] }) {
  const [open, setOpen] = useState(false);
  return <aside style={{ position: "fixed", right: 12, bottom: 80, zIndex: 1000 }}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="recent-goods-drawer" style={{ borderRadius: 24, padding: "10px 14px" }}>최근 본 상품 {goods.length}</button>
    {open && <div id="recent-goods-drawer" style={{ position: "absolute", right: 0, bottom: 48, width: 260, maxHeight: 420, overflowY: "auto", background: "#fff", border: "1px solid #ddd", boxShadow: "0 4px 16px #0002", padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><b>최근 본 상품</b><button type="button" onClick={() => setOpen(false)} aria-label="닫기">×</button></div>{goods.length === 0 ? <div className="empty">최근 본 상품이 없습니다.</div> : goods.map((item) => <a key={item.uid} href={item.link} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><img src={item.image} alt="" width={48} height={48} style={{ objectFit: "cover" }} /><span>{item.nameCodeAble}</span></a>)}</div>}
  </aside>;
}
