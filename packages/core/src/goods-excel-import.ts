import ExcelJS from "exceljs";
import { prisma } from "@shoppingmall/db";
import { type GoodsFormInput, createGoods } from "./goods-admin";

// Port of managers/goods/goods_adds.php + goods_post.php's `case "excel"`
// (vendor/goods/goods_post.php has the identical case, so this is shared by
// both admin and vendor callers via the vendorId/opts below — the migration
// plan initially assumed excel import was admin-only, which a direct read of
// the legacy vendor source disproved). Two legacy sub-features are
// deliberately not ported: "분류코드매칭"(matching another shop's category
// codes to this one's, `matching` checkbox) and "타서버 이미지복사"(rewriting
// externally-hosted <img> URLs found inside the 상세설명 HTML to locally
// mirrored copies, `img_copy` checkbox) — both are optional legacy toggles
// with narrow use (re-importing from a different, now-defunct competing
// platform) that would add a lot of complexity for a one-time migration
// aid nobody has asked to keep using. This repo also has no thumbnail/resize
// pipeline anywhere else, so unlike legacy's `createThumbnail()`, image2/
// image3 just reuse image1's saved file verbatim when left blank.
export const GOODS_EXCEL_HEADERS = [
  "상품명",
  "대표분류코드",
  "소비자가",
  "판매가",
  "매입가",
  "브랜드",
  "제조사",
  "원산지",
  "모델명",
  "자체상품코드",
  "진열상태",
  "판매상태",
  "재고",
  "검색키워드",
  "상품간략설명",
  "상품상세설명",
  "옵션",
  "상세이미지경로",
  "목록이미지경로",
  "작은목록이미지경로",
  "추가이미지경로",
  "상품정보제공고시",
  "배송비",
] as const;

export type GoodsExcelRawRow = {
  name: string;
  cate: string;
  consumerPrice: string;
  price: string;
  origPrice: string;
  brand: string;
  make: string;
  origin: string;
  model: string;
  goodsCode: string;
  displayUse: string;
  saleUse: string;
  qty: string;
  keyword: string;
  detail: string;
  explains: string;
  option: string;
  image1Url: string;
  image2Url: string;
  image3Url: string;
  otherImageUrls: string;
  requireInfo: string;
  deliveryType: string;
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
  return String(value).trim();
}

// Port of managers/goods/goods_excel_sample.xlsx — generated on demand
// instead of shipping a static binary in the repo.
export async function buildGoodsExcelSample(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("sample");
  sheet.addRow([...GOODS_EXCEL_HEADERS]);
  sheet.addRow([
    "Apple 아이폰 12 프로 256GB",
    "101001000000",
    "1600000",
    "1500000",
    "1300000",
    "아이폰",
    "Apple",
    "미국",
    "MGD73KH/A",
    "A00001",
    "Y",
    "Y",
    "무제한",
    "아이폰, iphone, 애플, apple",
    "충전기 어댑터 미포함 상품입니다.",
    "상품 상세설명",
    "색상|*|화이트||0||무제한||A00001|*|블랙||0||무제한||A00002",
    "https://example.com/iphone12.jpg",
    "",
    "",
    "",
    "",
    "1",
  ]);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export type ParsedGoodsExcel = { headerOk: boolean; rows: GoodsExcelRawRow[] };

// Header check is positional/loose (legacy has none at all — this repo adds
// one so a malformed file fails fast with a clear message instead of
// quietly importing garbage into 23 wrong columns).
export async function parseGoodsExcelBuffer(buffer: ArrayBuffer): Promise<ParsedGoodsExcel> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headerOk: false, rows: [] };

  const headerRow = sheet.getRow(1);
  const headerOk = GOODS_EXCEL_HEADERS.every((expected, i) => cellText(headerRow.getCell(i + 1).value) === expected);

  const rows: GoodsExcelRawRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells = Array.from({ length: 23 }, (_, i) => cellText(row.getCell(i + 1).value));
    const [
      name,
      cate,
      consumerPrice,
      price,
      origPrice,
      brand,
      make,
      origin,
      model,
      goodsCode,
      displayUse,
      saleUse,
      qty,
      keyword,
      detail,
      explains,
      option,
      image1Url,
      image2Url,
      image3Url,
      otherImageUrls,
      requireInfo,
      deliveryType,
    ] = cells;
    if (!name && !cate && !price) continue;
    rows.push({
      name,
      cate,
      consumerPrice,
      price,
      origPrice,
      brand,
      make,
      origin,
      model,
      goodsCode,
      displayUse,
      saleUse,
      qty,
      keyword,
      detail,
      explains,
      option,
      image1Url,
      image2Url,
      image3Url,
      otherImageUrls,
      requireInfo,
      deliveryType,
    });
  }
  return { headerOk, rows };
}

function parsePrice(raw: string): number {
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export type OptionCombo = { value: string; price: number; qtyType: number; qty: number; code: string };
export type ParsedOptionColumn = { dimensionNames: string; combos: OptionCombo[] };

// "색상|RAM|*|화이트|64G||0||무제한||A00001|*|화이트|128G||50000||무제한||A00002"
// -> dimensionNames "색상|*|RAM"(stored joined the same way detail.ts reads
// it back), combos [{value:"화이트|64G", price:0, qtyType:1, qty:0, code:"A00001"}, ...].
export function parseExcelOptionColumn(raw: string): ParsedOptionColumn | null {
  if (!raw.trim()) return null;
  const blocks = raw.split("|*|").map((b) => b.trim());
  if (blocks.length < 2) return null;

  const dimensionNames = blocks[0];
  const combos: OptionCombo[] = [];
  for (const block of blocks.slice(1)) {
    const parts = block.split("||");
    if (parts.length < 4) continue;
    const [value, priceRaw, qtyRaw, code] = parts;
    const qtyTrim = qtyRaw.trim();
    combos.push({
      value: value.trim(),
      price: parsePrice(priceRaw),
      qtyType: qtyTrim === "무제한" ? 1 : 0,
      qty: qtyTrim === "무제한" ? 0 : Math.max(0, Math.round(Number(qtyTrim.replace(/[^0-9]/g, "")) || 0)),
      code: code.trim(),
    });
  }
  return combos.length > 0 ? { dimensionNames, combos } : null;
}

async function createGoodsOptionsFromExcel(guid: number, parsed: ParsedOptionColumn): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.goodsOption.createMany({
      data: parsed.combos.map((c, i) => ({
        guid,
        value: c.value,
        price: c.price,
        qty_type: c.qtyType,
        qty: c.qty,
        code: c.code,
        used: 1,
        sequence: i,
      })),
    });
    await tx.goods.update({ where: { uid: guid }, data: { option_use: 1, option_info: parsed.dimensionNames } });
  });
}

export type GoodsExcelImportImages = { image1: string; image2: string; image3: string; otherImages: string[] };

export type GoodsExcelImportOptions = {
  vendorId: string;
  autoApprove: boolean;
  commissionType: number;
  commission: number;
  vendorHide: boolean;
};

export type GoodsExcelImportRowResult = { row: number; name: string; ok: boolean; error?: string; uid?: number };

// Pure mapping (no I/O) from one parsed Excel row + already-downloaded image
// paths to a creatable product — image downloading is the caller's job
// (apps/backoffice's lib/image-upload.ts owns filesystem access, same split
// as every other admin/vendor form in this repo).
export async function importGoodsExcelRow(
  row: GoodsExcelRawRow,
  images: GoodsExcelImportImages,
  opts: GoodsExcelImportOptions,
): Promise<{ ok: true; uid: number } | { ok: false; error: string }> {
  if (!row.name || !row.cate) return { ok: false, error: "상품명 또는 분류코드가 비어 있습니다." };

  let cate: bigint;
  try {
    cate = BigInt(row.cate);
  } catch {
    return { ok: false, error: `분류코드가 올바르지 않습니다: ${row.cate}` };
  }
  const cateRow = await prisma.cate.findFirst({ where: { cate } });
  if (!cateRow) return { ok: false, error: `존재하지 않는 분류코드입니다: ${row.cate}` };

  const price = parsePrice(row.price);
  if (price <= 0) return { ok: false, error: "판매가가 올바르지 않습니다." };

  const isUnlimited = row.qty.trim() === "무제한";
  const [deliveryTypeRaw, deliveryPriceRaw] = row.deliveryType.split("|");
  const deliveryType = Number(deliveryTypeRaw) || 1;

  const input: GoodsFormInput = {
    name: row.name,
    name_code_able: row.name,
    vendor: opts.vendorId,
    cateList: [cate],
    repCate: cate,
    price,
    orig_price: parsePrice(row.origPrice),
    consumer_price: parsePrice(row.consumerPrice),
    price_ment: "",
    commission_type: opts.commissionType,
    commission: opts.commission,
    image1: images.image1,
    image2: images.image2,
    image3: images.image3,
    otherImages: images.otherImages,
    detailImages: [],
    detail_image_only: false,
    detail_image_type: 1,
    explains: row.explains,
    detail: row.detail,
    goods_code: row.goodsCode,
    model: row.model,
    make: row.make,
    origin: row.origin,
    brand: row.brand,
    makingInfo: [],
    requireInfo: row.requireInfo.split(/\r?\n|\|\*\|/).map((value) => value.split("|")).filter(([name]) => name).map(([name, value]) => ({ name: name.trim(), value: (value ?? "").trim() })),
    qty_type: isUnlimited ? 1 : 0,
    qty: isUnlimited ? 0 : Math.max(0, Math.round(Number(row.qty.replace(/[^0-9]/g, "")) || 0)),
    limit_qty: 0,
    option_use: false,
    display_use: row.displayUse.trim().toUpperCase() === "Y",
    sale_use: row.saleUse.trim().toUpperCase() === "Y",
    order_priority: 5,
    icons: [],
    mileage_type: 2,
    mileage_common: 0,
    mileage_level: "",
    delivery_type: deliveryType,
    delivery_price: Number((deliveryPriceRaw ?? "").replace(/[^0-9]/g, "")) || 0,
    delivery_info: "",
    refund_info: "",
    exchange_info: "",
    as_info: "",
    keyword: row.keyword,
    cate_hide: cateRow.used === 0,
    vendor_hide: opts.vendorHide,
    engine_use: true,
  };

  const result = await createGoods(input, { autoApprove: opts.autoApprove });
  if (!result.ok) return result;

  const parsedOption = parseExcelOptionColumn(row.option);
  if (parsedOption) await createGoodsOptionsFromExcel(result.uid, parsedOption);

  return { ok: true, uid: result.uid };
}
