import { type Prisma, prisma } from "@shoppingmall/db";

type DbClient = typeof prisma | Prisma.TransactionClient;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

// Port of lib/lib.Shop.php:2648 couponIssuance(). Legacy has no dedupe
// guard — any trigger (admin/signup/first-order/birthday/PDP download) can
// issue the same member the same coupon repeatedly. Phase 4 only wires up
// the PDP "download" trigger (type=4, self-service, no admin screen to gate
// abuse), so a duplicate-issue check is added here as a deliberate
// safety net the legacy trigger set didn't need.
export type IssueCouponResult = { ok: true } | { ok: false; error: string };

export async function issueCoupon(memberId: string, couponManagerUid: number, goodsUid = 0): Promise<IssueCouponResult> {
  const template = await prisma.couponManager.findFirst({ where: { uid: couponManagerUid } });
  if (!template) return { ok: false, error: "존재하지 않는 쿠폰입니다." };

  const eDate = template.use_type === 0 ? template.use_e_date : addDays(new Date(), template.use_day);
  if (eDate && eDate.getTime() < Date.now()) return { ok: false, error: "발급 기간이 종료된 쿠폰입니다." };

  const existing = await prisma.coupon.findFirst({
    where: { id: memberId, c_uid: couponManagerUid, g_uid: goodsUid },
  });
  if (existing) return { ok: false, error: "이미 발급받은 쿠폰입니다." };

  await prisma.coupon.create({
    data: {
      c_uid: couponManagerUid,
      g_uid: goodsUid,
      id: memberId,
      status: 0,
      e_date: eDate ?? undefined,
      signdate: now(),
    },
  });
  return { ok: true };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Port of lib/lib.Shop.php:198's discount math half of getCouponPrice() —
// pure, so it's unit-testable without a DB.
export function calcCouponDiscount(
  price: number,
  discount: number,
  discountType: "P" | "W",
  discountLimit: number,
): number {
  if (discountType === "W") return Math.min(discount, price);
  const amount = Math.floor((price * discount) / 100);
  return discountLimit > 0 ? Math.min(amount, discountLimit, price) : Math.min(amount, price);
}

// Port of lib/lib.Shop.php:198 getCouponPrice($price, $c_uid) — the I/O half
// (template lookup + use_limit/use period gate) around calcCouponDiscount.
export async function getCouponPrice(price: number, couponManagerUid: number): Promise<number> {
  const template = await prisma.couponManager.findFirst({ where: { uid: couponManagerUid } });
  if (!template) return 0;
  if (template.use_limit > 0 && price < template.use_limit) return 0;
  return calcCouponDiscount(price, template.discount, template.discount_type, template.discount_limit);
}

export type MyCouponItem = {
  couponUid: number;
  name: string;
  discount: number;
  discountType: "P" | "W";
  discountLimit: number;
  useLimit: number;
  eDate: Date | null;
  goodsUid: number;
};

// Port of order.php's usable-coupon list (cart-level: g_uid=0).
export async function getMyCoupons(memberId: string): Promise<MyCouponItem[]> {
  const rows = await prisma.coupon.findMany({
    where: { id: memberId, status: 0, e_date: { gt: new Date() } },
    orderBy: { uid: "desc" },
  });
  if (rows.length === 0) return [];

  const templates = await prisma.couponManager.findMany({ where: { uid: { in: rows.map((r) => r.c_uid) } } });
  const byUid = new Map(templates.map((t) => [t.uid, t]));

  return rows
    .map((r) => {
      const t = byUid.get(r.c_uid);
      if (!t) return null;
      return {
        couponUid: r.uid,
        name: t.name,
        discount: t.discount,
        discountType: t.discount_type,
        discountLimit: t.discount_limit,
        useLimit: t.use_limit,
        eDate: r.e_date,
        goodsUid: r.g_uid,
      };
    })
    .filter((c): c is MyCouponItem => c !== null);
}

export type DownloadableCoupon = { couponManagerUid: number; name: string; discount: number; discountType: "P" | "W" };

// Product-detail "쿠폰 다운로드" button data — coupon_manager.type=4 rows
// whose goods_order list is either empty (전체상품 대상) or includes this
// goods uid. use_type/use_e_date/use_day filtering happens at issueCoupon()
// time instead of here, matching legacy showing the button even for
// soon-to-expire campaigns.
export async function getDownloadableCoupons(goodsUid: number): Promise<DownloadableCoupon[]> {
  const templates = await prisma.couponManager.findMany({ where: { type: 4 } });
  return templates
    .filter((t) => {
      const ids = t.goods_order
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return ids.length === 0 || ids.includes(String(goodsUid));
    })
    .map((t) => ({ couponManagerUid: t.uid, name: t.name, discount: t.discount, discountType: t.discount_type }));
}

export async function consumeCoupon(couponUid: number, db: DbClient = prisma): Promise<void> {
  await db.coupon.update({ where: { uid: couponUid }, data: { status: 1, usedate: now() } });
}

export async function restoreCoupon(couponUid: number, db: DbClient = prisma): Promise<void> {
  await db.coupon.update({ where: { uid: couponUid }, data: { status: 0, usedate: 0 } });
}
