"use client";

import { useEffect } from "react";
import { recordGoodsViewAction } from "@/app/goods/[uid]/actions";

export function GoodsViewTracker({ goodsUid, vendor }: { goodsUid: number; vendor: string }) {
  useEffect(() => {
    void recordGoodsViewAction(goodsUid, vendor);
  }, [goodsUid, vendor]);
  return null;
}
