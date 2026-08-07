import { prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";
import { type GoodsCardViewModel, toGoodsCard } from "./goods";
import type { EventDiscountMap, PriceLimitConfig } from "./pricing";

// display_check_arr from php/main.php:10 — maps a design_main_display_order
// section key to the `main1_display{i}` / `design_main_display{i}` slot index.
const DISPLAY_SLOT: Record<string, 1 | 2 | 3> = { reco: 2, best: 1, new: 3 };

export type GoodsDisplayType = "type0" | "type1" | "type1_group";

function displayType(value: number): GoodsDisplayType {
  if (value === 3) return "type1_group";
  if (value > 1) return "type1";
  return "type0";
}

export type GoodsSection = {
  kind: "goods";
  key: "reco" | "best" | "new";
  displayType: GoodsDisplayType;
  goods: GoodsCardViewModel[];
};

export type CategorySection = {
  kind: "category";
  groups: { cateName: string; displayType: GoodsDisplayType; goods: GoodsCardViewModel[] }[];
};

export type CustomCodeSection = {
  kind: "code";
  html: string;
};

export type HomeSection = GoodsSection | CategorySection | CustomCodeSection;

async function getEventDiscounts(): Promise<EventDiscountMap> {
  // php/init.php:142-147 `SELECT uid, discount FROM mallRN_exhibition WHERE status='2' && discount_yn='Y' && discount>0`
  const rows = await prisma.exhibition.findMany({
    where: { status: 2, discount_yn: "Y", discount: { gt: 0 } },
    select: { uid: true, discount: true },
  });
  return new Map(rows.map((r) => [r.uid, r.discount]));
}

// main1_display{1,2,3} / main1_display{1,2,3}_sequence are three physically
// distinct columns (see packages/db DDL) — Prisma's generated where/orderBy
// types don't accept a computed field name, so each slot gets its own branch
// rather than interpolating `main1_display${slot}`.
const MAIN1_DISPLAY_WHERE = {
  1: { main1_display1: 1 as const },
  2: { main1_display2: 1 as const },
  3: { main1_display3: 1 as const },
};
const MAIN1_DISPLAY_ORDER = {
  1: { main1_display1_sequence: "asc" as const },
  2: { main1_display2_sequence: "asc" as const },
  3: { main1_display3_sequence: "asc" as const },
};
const MAIN2_DISPLAY_WHERE = {
  1: { main2_display1: 1 as const },
  2: { main2_display2: 1 as const },
  3: { main2_display3: 1 as const },
};
const MAIN2_DISPLAY_ORDER = {
  1: { main2_display1_sequence: "asc" as const },
  2: { main2_display2_sequence: "asc" as const },
  3: { main2_display3_sequence: "asc" as const },
};

async function getGoodsSection(
  key: "reco" | "best" | "new",
  slot: 1 | 2 | 3,
  displayValue: number,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): Promise<GoodsSection | null> {
  if (displayValue === 0) return null;

  const rows = await prisma.goods.findMany({
    where: { display_use: 1, auth_ck: "Y", cate_hide: 0, vendor_hide: 0, ...MAIN1_DISPLAY_WHERE[slot] },
    orderBy: MAIN1_DISPLAY_ORDER[slot],
  });

  if (rows.length === 0) return null;

  return {
    kind: "goods",
    key,
    displayType: displayType(displayValue),
    goods: rows.map((row) => toGoodsCard(row, eventDiscounts, priceLimitConfig)),
  };
}

async function getCategorySection(
  config: ShopConfig,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): Promise<CategorySection | null> {
  if (config.mainCategory === 0 || !config.mainCategoryInfo) return null;

  const entries = config.mainCategoryInfo.split("|*|");
  const groups: CategorySection["groups"] = [];

  for (const entry of entries) {
    const [cateStr, displaySlotStr, usedStr] = entry.split("|");
    if (usedStr === "0" || !cateStr || !displaySlotStr) continue;

    const cate = BigInt(cateStr);
    const slot = Number(displaySlotStr) as 1 | 2 | 3;
    const cateName = (await prisma.cate.findFirst({ where: { cate }, select: { cate_name: true } }))
      ?.cate_name;
    if (!cateName) continue;

    const rows = await prisma.goods.findMany({
      where: { display_use: 1, auth_ck: "Y", cate_hide: 0, vendor_hide: 0, cate, ...MAIN2_DISPLAY_WHERE[slot] },
      orderBy: MAIN2_DISPLAY_ORDER[slot],
    });

    groups.push({
      cateName,
      displayType: displayType(config.mainCategory),
      goods: rows.map((row) => toGoodsCard(row, eventDiscounts, priceLimitConfig)),
    });
  }

  return groups.length > 0 ? { kind: "category", groups } : null;
}

// Port of php/main.php's $main_display_arr loop (design_main_display_order,
// default "reco, code, best, cate, new"). Member-level pricing/coupons are
// intentionally not applied — see pricing.ts.
export async function getHomeSections(config: ShopConfig): Promise<HomeSection[]> {
  const order = config.mainDisplayOrder.split(",").map((s) => s.trim());
  const eventDiscounts = await getEventDiscounts();
  const priceLimitConfig: PriceLimitConfig = {
    goodsPriceLimit1: config.goodsPriceLimit1,
    goodsPriceLimit2: config.goodsPriceLimit2,
  };

  const sections: HomeSection[] = [];

  for (const key of order) {
    if (key === "reco" || key === "best" || key === "new") {
      const slot = DISPLAY_SLOT[key];
      const displayValue = slot === 1 ? config.mainDisplay1 : slot === 2 ? config.mainDisplay2 : config.mainDisplay3;
      const section = await getGoodsSection(key, slot, displayValue, eventDiscounts, priceLimitConfig);
      if (section) sections.push(section);
    } else if (key === "cate") {
      const section = await getCategorySection(config, eventDiscounts, priceLimitConfig);
      if (section) sections.push(section);
    } else if (key === "code") {
      if (config.mainCustomCode !== 0 && config.mainCustomCodeInfo) {
        sections.push({ kind: "code", html: config.mainCustomCodeInfo });
      }
    }
  }

  return sections;
}
