import { type Prisma, prisma } from "@shoppingmall/db";
import { sanitizeRichText } from "./sanitize";

type DbClient = typeof prisma | Prisma.TransactionClient;

// Admin-only product CRUD. Unlike the rest of this repo's core modules
// (which translate DB rows into camelCase view models for a specific
// screen), this input type stays close to the DB's own field shape —
// goods_info.html has ~47 fields grouped into the same sections used below,
// and re-deriving a parallel camelCase vocabulary for an internal-only admin
// form isn't worth the translation code it'd take. Niche fields not read by
// any current storefront view (related_goods matching UI, the 9 main/store
// display-slot toggles, keyword auto-collection) are deliberately left out
// — see MIGRATION.md's Phase 7 scope notes.
export type GoodsFormInput = {
  name: string;
  name_code_able: string;
  vendor: string;
  cateList: bigint[]; // selected category `cate` values (writes GoodsCate rows)
  repCate: bigint; // must be one of cateList — becomes Goods.cate
  price: number;
  orig_price: number;
  consumer_price: number;
  price_ment: string;
  commission_type: number;
  commission: number;
  image1: string;
  image2: string;
  image3: string;
  otherImages: string[]; // -> other_image, comma-joined (detail.ts's read format)
  detailImages: string[]; // -> detail_image, comma-joined
  detail_image_only: boolean;
  detail_image_type: 1 | 2;
  explains: string;
  detail: string;
  goods_code: string;
  model: string;
  make: string;
  origin: string;
  brand: string;
  makingInfo: { name: string; value: string }[]; // -> making_info, "|*|"/"|" joined (detail.ts's read format)
  requireInfo: { name: string; value: string }[];
  qty_type: number;
  qty: number;
  limit_qty: number;
  option_use: boolean;
  display_use: boolean;
  sale_use: boolean;
  order_priority: number;
  icons: string[]; // -> icon, "|"-joined
  mileage_type: 1 | 2 | 3 | 4;
  mileage_common: number;
  mileage_level: string;
  delivery_type: number;
  delivery_price: number;
  delivery_info: string;
  refund_info: string;
  exchange_info: string;
  as_info: string;
  keyword: string;
  cate_hide: boolean;
  vendor_hide: boolean;
  engine_use: boolean;
};

function toGoodsData(input: GoodsFormInput) {
  return {
    name: input.name,
    name_code_able: input.name_code_able,
    vendor: input.vendor,
    cate: input.repCate,
    price: input.price,
    orig_price: input.orig_price,
    consumer_price: input.consumer_price,
    price_ment: input.price_ment,
    commission_type: input.commission_type,
    commission: input.commission,
    image1: input.image1,
    image2: input.image2,
    image3: input.image3,
    other_image: input.otherImages.filter(Boolean).join(","),
    detail_image: input.detailImages.filter(Boolean).join(","),
    detail_image_only: input.detail_image_only ? 1 : 0,
    detail_image_type: input.detail_image_type,
    explains: sanitizeRichText(input.explains),
    detail: sanitizeRichText(input.detail),
    goods_code: input.goods_code,
    model: input.model,
    make: input.make,
    origin: input.origin,
    brand: input.brand,
    making_info: input.makingInfo
      .filter((m) => m.name)
      .map((m) => `${m.name}|${m.value}`)
      .join("|*|"),
    require_info: input.requireInfo.filter((item) => item.name).map((item) => `${item.name}|${item.value}`).join("|*|"),
    qty_type: input.qty_type,
    qty: input.qty,
    limit_qty: input.limit_qty,
    option_use: input.option_use ? 1 : 0,
    display_use: input.display_use ? 1 : 0,
    sale_use: input.sale_use ? 1 : 0,
    order_priority: input.order_priority,
    icon: input.icons.filter(Boolean).join("|"),
    mileage_type: input.mileage_type,
    mileage_common: input.mileage_common,
    mileage_level: input.mileage_level,
    delivery_type: input.delivery_type,
    delivery_price: input.delivery_price,
    delivery_info: sanitizeRichText(input.delivery_info),
    refund_info: sanitizeRichText(input.refund_info),
    exchange_info: sanitizeRichText(input.exchange_info),
    as_info: sanitizeRichText(input.as_info),
    keyword: input.keyword,
    cate_hide: input.cate_hide ? 1 : 0,
    vendor_hide: input.vendor_hide ? 1 : 0,
    engine_use: input.engine_use ? 1 : 0,
  };
}

async function syncGoodsCate(guid: number, cateList: bigint[], repCate: bigint, db: DbClient = prisma): Promise<void> {
  await db.goodsCate.deleteMany({ where: { guid } });
  if (cateList.length === 0) return;
  await db.goodsCate.createMany({
    data: cateList.map((cate) => ({ guid, cate, cate_rep: cate === repCate ? 1 : 0 })),
  });
}

export type CreateGoodsResult = { ok: true; uid: number } | { ok: false; error: string };

// `autoApprove` defaults true (admin-authored products need no gate).
// apps/backoffice's vendor pages pass `Vendor.goods_auth==='A'` here instead
// — port of managers/goods/goods_post.php's `case "auth_ck"` companion
// check in vendor/goods/goods_post.php (see vendor.ts callers).
export async function createGoods(input: GoodsFormInput, opts: { autoApprove?: boolean } = {}): Promise<CreateGoodsResult> {
  if (!input.name.trim()) return { ok: false, error: "상품명을 입력해 주세요." };
  if (input.cateList.length === 0) return { ok: false, error: "분류를 하나 이상 선택해 주세요." };

  const authCk = (opts.autoApprove ?? true) ? "Y" : "N";
  const uid = await prisma.$transaction(async (tx) => {
    const created = await tx.goods.create({ data: { ...toGoodsData(input), auth_ck: authCk } });
    await syncGoodsCate(created.uid, input.cateList, input.repCate, tx);
    return created.uid;
  });
  return { ok: true, uid };
}

export type UpdateGoodsResult = { ok: true } | { ok: false; error: string };

export async function updateGoods(uid: number, input: GoodsFormInput): Promise<UpdateGoodsResult> {
  if (!input.name.trim()) return { ok: false, error: "상품명을 입력해 주세요." };
  if (input.cateList.length === 0) return { ok: false, error: "분류를 하나 이상 선택해 주세요." };

  await prisma.$transaction(async (tx) => {
    await tx.goods.update({ where: { uid }, data: toGoodsData(input) });
    await syncGoodsCate(uid, input.cateList, input.repCate, tx);
  });
  return { ok: true };
}

export type AdminGoodsListItem = {
  uid: number;
  name: string;
  vendor: string;
  price: number;
  qty: number;
  displayUse: boolean;
  saleUse: boolean;
  authCk: "Y" | "N";
  signdate: number;
};

export type AdminGoodsListResult = { items: AdminGoodsListItem[]; total: number; page: number; totalPages: number };

const ADMIN_GOODS_PAGE_SIZE = 20;

// Port of managers/goods/goods_list.php, keyword-only search (this repo's
// established single-field simplification, see listing.ts's keywordWhere).
// `vendor`/`authCk` filters power both the vendor-scoped "my products" list
// (apps/backoffice/app/vendor) and the admin "pending approval" queue.
export async function getAdminGoodsList(filters: { keyword?: string; vendor?: string; authCk?: "Y" | "N" }, page = 1): Promise<AdminGoodsListResult> {
  const where = {
    ...(filters.keyword ? { OR: [{ name: { contains: filters.keyword } }, { goods_code: { contains: filters.keyword } }] } : {}),
    ...(filters.vendor !== undefined ? { vendor: filters.vendor } : {}),
    ...(filters.authCk ? { auth_ck: filters.authCk } : {}),
  };

  const total = await prisma.goods.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_GOODS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.goods.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * ADMIN_GOODS_PAGE_SIZE,
    take: ADMIN_GOODS_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({
      uid: r.uid,
      name: r.name,
      vendor: r.vendor,
      price: r.price,
      qty: r.qty,
      displayUse: r.display_use === 1,
      saleUse: r.sale_use === 1,
      authCk: r.auth_ck,
      signdate: r.signdate,
    })),
    total,
    page: safePage,
    totalPages,
  };
}

export type GoodsAuthResult = { ok: true } | { ok: false; error: string };

// Port of managers/goods/goods_post.php's `case "auth_ck"` — admin approves
// or rejects a vendor-submitted product still pending display.
export async function approveGoodsAuth(uid: number, authCk: "Y" | "N"): Promise<GoodsAuthResult> {
  const updated = await prisma.goods.updateMany({ where: { uid }, data: { auth_ck: authCk } });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 상품입니다." };
  return { ok: true };
}

export type AdminGoodsOptionRow = { uid: number; value: string; price: number; qtyType: number; qty: number; used: boolean; code: string; sequence: number };

export type AdminGoodsDetail = GoodsFormInput & { uid: number; cateList: bigint[]; repCate: bigint; options: AdminGoodsOptionRow[] };

export async function getAdminGoodsDetail(uid: number): Promise<AdminGoodsDetail | null> {
  const row = await prisma.goods.findFirst({ where: { uid } });
  if (!row) return null;
  const cateRows = await prisma.goodsCate.findMany({ where: { guid: uid } });
  const options = await prisma.goodsOption.findMany({ where: { guid: uid }, orderBy: { sequence: "asc" } });

  return {
    uid: row.uid,
    name: row.name,
    name_code_able: row.name_code_able,
    vendor: row.vendor,
    cateList: cateRows.map((c) => c.cate),
    repCate: cateRows.find((c) => c.cate_rep === 1)?.cate ?? row.cate,
    price: row.price,
    orig_price: row.orig_price,
    consumer_price: row.consumer_price,
    price_ment: row.price_ment,
    commission_type: row.commission_type,
    commission: row.commission,
    image1: row.image1,
    image2: row.image2,
    image3: row.image3,
    otherImages: row.other_image.split(",").filter(Boolean),
    detailImages: row.detail_image.split(",").filter(Boolean),
    detail_image_only: row.detail_image_only === 1,
    detail_image_type: row.detail_image_type === 2 ? 2 : 1,
    explains: row.explains,
    detail: row.detail,
    goods_code: row.goods_code,
    model: row.model,
    make: row.make,
    origin: row.origin,
    brand: row.brand,
    makingInfo: row.making_info
      ? row.making_info
          .split("|*|")
          .map((v) => v.split("|"))
          .filter((p) => p[0])
          .map(([name, value]) => ({ name, value: value ?? "" }))
      : [],
    requireInfo: row.require_info
      ? row.require_info.split("|*|").map((value) => value.split("|")).filter(([name]) => name).map(([name, value]) => ({ name, value: value ?? "" }))
      : [],
    qty_type: row.qty_type,
    qty: row.qty,
    limit_qty: row.limit_qty,
    option_use: row.option_use === 1,
    display_use: row.display_use === 1,
    sale_use: row.sale_use === 1,
    order_priority: row.order_priority,
    icons: row.icon.split("|").filter(Boolean),
    mileage_type: ([1, 2, 3, 4].includes(row.mileage_type) ? row.mileage_type : 2) as 1 | 2 | 3 | 4,
    mileage_common: row.mileage_common,
    mileage_level: row.mileage_level,
    delivery_type: row.delivery_type,
    delivery_price: row.delivery_price,
    delivery_info: row.delivery_info,
    refund_info: row.refund_info,
    exchange_info: row.exchange_info,
    as_info: row.as_info,
    keyword: row.keyword,
    cate_hide: row.cate_hide === 1,
    vendor_hide: row.vendor_hide === 1,
    engine_use: row.engine_use === 1,
    options: options.map((o) => ({
      uid: o.uid,
      value: o.value,
      price: o.price,
      qtyType: o.qty_type,
      qty: o.qty,
      used: o.used === 1,
      code: o.code,
      sequence: o.sequence,
    })),
  };
}

export type OptionDimension = { name: string; values: string[] };

// Port of js_goods_option.js's `getCombinations()` cartesian product,
// capped at 1000 combinations same as legacy. `option_info` stores only the
// dimension NAMES joined by "|*|" (e.g. "색상|*|사이즈" for two axes) — see
// detail.ts's `option_info.split("|*|").map(d => d.split("|")[0])`. The
// actual per-combination values/prices live in GoodsOption rows, whose
// `value` column holds the `|`-joined per-dimension values for that one
// combination (e.g. "화이트|S").
export function generateOptionCombinations(dimensions: OptionDimension[]): string[][] {
  if (dimensions.length === 0) return [];
  let combos: string[][] = [[]];
  for (const dim of dimensions) {
    const next: string[][] = [];
    for (const combo of combos) {
      for (const value of dim.values) {
        if (!value.trim()) continue;
        next.push([...combo, value.trim()]);
        if (next.length > 1000) return next.slice(0, 1000);
      }
    }
    combos = next;
  }
  return combos;
}

export type CreateGoodsOptionsResult = { ok: true; count: number } | { ok: false; error: string };

// Replaces every existing option row for this product with a freshly
// generated set — matches the admin UI's "옵션품목 만들기" button, which
// legacy also treats as a full regeneration rather than an incremental add.
export async function createGoodsOptions(guid: number, dimensions: OptionDimension[]): Promise<CreateGoodsOptionsResult> {
  const combos = generateOptionCombinations(dimensions);
  if (combos.length === 0) return { ok: false, error: "옵션 값을 입력해 주세요." };
  if (combos.length > 1000) return { ok: false, error: "옵션 조합은 최대 1000개까지 가능합니다." };

  const dimensionNames = dimensions.map((d) => d.name).join("|*|");

  await prisma.$transaction(async (tx) => {
    await tx.goodsOption.deleteMany({ where: { guid } });
    await tx.goodsOption.createMany({
      data: combos.map((combo, i) => ({ guid, value: combo.join("|"), used: 1, sequence: i })),
    });
    await tx.goods.update({ where: { uid: guid }, data: { option_use: 1, option_info: dimensionNames } });
  });
  return { ok: true, count: combos.length };
}

export type UpdateGoodsOptionInput = { price: number; qtyType: number; qty: number; used: boolean; code: string };

export async function updateGoodsOption(uid: number, input: UpdateGoodsOptionInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await prisma.goodsOption.updateMany({
    where: { uid },
    data: { price: input.price, qty_type: input.qtyType, qty: input.qty, used: input.used ? 1 : 0, code: input.code },
  });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 옵션입니다." };
  return { ok: true };
}

export async function deleteGoodsOption(uid: number): Promise<void> {
  await prisma.goodsOption.deleteMany({ where: { uid } });
}

export type VendorOption = { id: string; name: string };

// Small helper for the goods form's vendor dropdown — vendor-admin.ts (a
// separate concern, admin-side vendor list/approval) owns the fuller vendor
// list with filters/pagination.
export async function getVendorOptions(): Promise<VendorOption[]> {
  const rows = await prisma.vendor.findMany({ where: { auth: "Y" }, select: { id: true, comp_name: true }, orderBy: { comp_name: "asc" } });
  return rows.map((r) => ({ id: r.id, name: r.comp_name }));
}

export type GoodsBulkEditItem = {
  uid: number;
  name: string;
  price: number;
  origPrice: number;
  consumerPrice: number;
  commissionType: number;
  commission: number;
  qtyType: number;
  qty: number;
  optionUse: boolean;
  orderPriority: number;
};

export type GoodsBulkEditListResult = { items: GoodsBulkEditItem[]; total: number; page: number; totalPages: number };

const GOODS_BULK_EDIT_PAGE_SIZE = 30;

// Port of managers/goods/goods_modify_list.php's grid — a wider field set
// than AdminGoodsListItem (price/stock/commission bulk-edit needs columns
// the regular list doesn't fetch), scoped to admin/vendor via the same
// `vendor` filter pattern as getAdminGoodsList.
export async function getGoodsBulkEditList(filters: { keyword?: string; vendor?: string }, page = 1): Promise<GoodsBulkEditListResult> {
  const where = {
    ...(filters.keyword ? { OR: [{ name: { contains: filters.keyword } }, { goods_code: { contains: filters.keyword } }] } : {}),
    ...(filters.vendor !== undefined ? { vendor: filters.vendor } : {}),
  };

  const total = await prisma.goods.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / GOODS_BULK_EDIT_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.goods.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * GOODS_BULK_EDIT_PAGE_SIZE,
    take: GOODS_BULK_EDIT_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({
      uid: r.uid,
      name: r.name,
      price: r.price,
      origPrice: r.orig_price,
      consumerPrice: r.consumer_price,
      commissionType: r.commission_type,
      commission: r.commission,
      qtyType: r.qty_type,
      qty: r.qty,
      optionUse: r.option_use === 1,
      orderPriority: r.order_priority,
    })),
    total,
    page: safePage,
    totalPages,
  };
}

export type GoodsBulkPricingRow = {
  uid: number;
  price: number;
  origPrice: number;
  consumerPrice: number;
  commissionType: number;
  commission: number;
  qtyType: number;
  qty: number;
};

export type GoodsBulkResult = { ok: true } | { ok: false; error: string };

// Option-managed products keep their stock on GoodsOption rows (per-
// combination), so `qty`/`qtyType` here are ignored for those — same rule
// the option builder UI already enforces on the single-product edit form.
export async function bulkUpdateGoodsPricing(rows: GoodsBulkPricingRow[], vendorId?: string): Promise<GoodsBulkResult> {
  const uids = rows.map((r) => r.uid);
  const existing = await prisma.goods.findMany({ where: { uid: { in: uids }, ...(vendorId ? { vendor: vendorId } : {}) } });
  if (existing.length !== uids.length) return { ok: false, error: "권한이 없거나 존재하지 않는 상품이 포함되어 있습니다." };
  const optionUseByUid = new Map(existing.map((g) => [g.uid, g.option_use === 1]));

  await prisma.$transaction(
    rows.map((r) =>
      prisma.goods.update({
        where: { uid: r.uid },
        data: {
          price: r.price,
          orig_price: r.origPrice,
          consumer_price: r.consumerPrice,
          commission_type: r.commissionType,
          commission: r.commission,
          ...(optionUseByUid.get(r.uid) ? {} : { qty_type: r.qtyType, qty: r.qty }),
        },
      }),
    ),
  );
  return { ok: true };
}

export async function bulkUpdateOrderPriority(uids: number[], priority: number, vendorId?: string): Promise<GoodsBulkResult> {
  const updated = await prisma.goods.updateMany({
    where: { uid: { in: uids }, ...(vendorId ? { vendor: vendorId } : {}) },
    data: { order_priority: priority },
  });
  if (updated.count === 0) return { ok: false, error: "권한이 없거나 존재하지 않는 상품입니다." };
  return { ok: true };
}

const EXPORT_ROW_CAP = 5000;

// Backs the admin goods list's excel-download button — same filters/columns
// as getAdminGoodsList, just without pagination (capped rather than
// unbounded, same safety margin as member/order exports below).
export async function getAdminGoodsExportRows(filters: { keyword?: string; vendor?: string; authCk?: "Y" | "N" }): Promise<AdminGoodsListItem[]> {
  const where = {
    ...(filters.keyword ? { OR: [{ name: { contains: filters.keyword } }, { goods_code: { contains: filters.keyword } }] } : {}),
    ...(filters.vendor !== undefined ? { vendor: filters.vendor } : {}),
    ...(filters.authCk ? { auth_ck: filters.authCk } : {}),
  };
  const rows = await prisma.goods.findMany({ where, orderBy: { uid: "desc" }, take: EXPORT_ROW_CAP });
  return rows.map((r) => ({
    uid: r.uid,
    name: r.name,
    vendor: r.vendor,
    price: r.price,
    qty: r.qty,
    displayUse: r.display_use === 1,
    saleUse: r.sale_use === 1,
    authCk: r.auth_ck,
    signdate: r.signdate,
  }));
}
