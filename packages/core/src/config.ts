import { prisma } from "@shoppingmall/db";
import { sanitizeRichText } from "./sanitize";

export type ShopConfig = Awaited<ReturnType<typeof getShopConfig>>;

// Port of php/init.php:85-86 `SELECT * FROM mallRN_configuration WHERE uid=1`.
export async function getShopConfig() {
  const row = await prisma.configuration.findUniqueOrThrow({ where: { uid: 1 } });
  return {
    basicName: row.basic_name,
    basicTitle: row.basic_title,
    basicDescription: row.basic_description,
    basicKeyword: row.basic_keyword,
    basicUrl: row.basic_url,
    basicAdmin: row.basic_admin,
    basicEmail: row.basic_email,
    compName: row.comp_name,
    compOwner: row.comp_owner,
    compLicenseNo1: row.comp_license_no1,
    compLicenseNo2: row.comp_license_no2,
    compTel: row.comp_tel,
    compFax: row.comp_fax,
    compAddress1: row.comp_address1,
    compAddress2: row.comp_address2,
    compRtnAddress1: row.comp_rtn_address1,
    compRtnAddress2: row.comp_rtn_address2,
    csTime1: row.basic_cs_time1 || "09:00 ~ 18:00",
    csTime2: row.basic_cs_time2 || "휴무",
    csTime3: row.basic_cs_time3 || "휴무",
    csTime4: row.basic_cs_time4 || "12:00 ~ 13:00",
    designTopMenu: row.design_top_menu,
    mobileTopMenu: row.mobile_top_menu,
    mainDisplayOrder: row.design_main_display_order || "reco, code, best, cate, new",
    mainDisplay1: row.design_main_display1,
    mainDisplay2: row.design_main_display2,
    mainDisplay3: row.design_main_display3,
    mainCategory: row.design_main_category,
    mainCategoryInfo: row.design_main_category_info,
    mainCustomCode: row.design_main_custom_code,
    mainCustomCodeInfo: row.design_main_custom_code_info,
    iconDisplay: row.design_icon_display,
    vendorLink: row.design_vendor_link,
    mobileYn: row.mobile_yn,
    goodsPriceLimit1: row.goods_price_limit1,
    goodsPriceLimit2: row.goods_price_limit2,
    goodsEngineNaver: row.goods_engine_naver === 1,
    goodsEngineDaum: row.goods_engine_daum === 1,
    goodsDeliveryInfo: row.goods_delivery_info,
    goodsRefundInfo: row.goods_refund_info,
    goodsExchangeInfo: row.goods_exchange_info,
    goodsAsInfo: row.goods_as_info,
    paymentBankInfo: row.payment_bank_info,
    paymentTypeB: row.payment_type_b,
    paymentTypeC: row.payment_type_c,
    paymentTypeH: row.payment_type_h,
    paymentCp: row.payment_cp,
    paymentShopId: row.payment_shop_id,
    paymentShopKey: row.payment_shop_key,
    paymentCommissionC: row.payment_commission_c,
    paymentCommissionH: row.payment_commission_h,
    smsYn: row.sms_yn,
    smsKey: row.sms_key,
    smsSecret: row.sms_secret,
    smsCallingNumber: row.sms_calling_number,
    smsAdminNumber1: row.sms_admin_number1,
    smsAdminNumber2: row.sms_admin_number2,
    smsAdminNumber3: row.sms_admin_number3,
    deliveryType: row.delivery_type,
    deliveryDPrice: row.delivery_d_price,
    deliveryPType: row.delivery_p_type,
    deliveryPPrice1: row.delivery_p_price1,
    deliveryPPrice2: row.delivery_p_price2,
    memberMileageValidityYn: row.member_mileage_validity_yn,
    memberMileageValidity: row.member_mileage_validity,
    memberMileageValidityType: row.member_mileage_validity_type,
    naverTag: row.script_naver_tag,
    googleAnalytics: row.script_google_analytics,
    signDate: row.signdate,
  };
}

// Port of managers/conf/base_info.php.
export type UpdateBasicConfigInput = {
  basicName: string;
  basicTitle: string;
  basicDescription: string;
  basicKeyword: string;
  basicUrl: string;
  basicAdmin: string;
  basicEmail: string;
  compName: string;
  compOwner: string;
  compTel: string;
  compFax: string;
  compAddress1: string;
  compAddress2: string;
  csTime1: string;
  csTime2: string;
  csTime3: string;
  csTime4: string;
};

export async function updateBasicConfig(input: UpdateBasicConfigInput): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 1 },
    data: {
      basic_name: input.basicName,
      basic_title: input.basicTitle,
      basic_description: input.basicDescription,
      basic_keyword: input.basicKeyword,
      basic_url: input.basicUrl,
      basic_admin: input.basicAdmin,
      basic_email: input.basicEmail,
      comp_name: input.compName,
      comp_owner: input.compOwner,
      comp_tel: input.compTel,
      comp_fax: input.compFax,
      comp_address1: input.compAddress1,
      comp_address2: input.compAddress2,
      basic_cs_time1: input.csTime1,
      basic_cs_time2: input.csTime2,
      basic_cs_time3: input.csTime3,
      basic_cs_time4: input.csTime4,
    },
  });
}

// Port of managers/conf/delivery_info.php.
export type UpdateDeliveryConfigInput = {
  deliveryType: "F" | "D" | "P";
  deliveryDPrice: number;
  deliveryPPrice1: number;
  deliveryPPrice2: number;
};

export async function updateDeliveryConfig(input: UpdateDeliveryConfigInput): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 1 },
    data: {
      delivery_type: input.deliveryType,
      delivery_d_price: input.deliveryDPrice,
      delivery_p_price1: input.deliveryPPrice1,
      delivery_p_price2: input.deliveryPPrice2,
    },
  });
}

// Port of managers/conf/payment_info.php, trimmed to the fields this repo's
// PaymentGateway abstraction actually reads (payment_cp/payment_shop_id/
// payment_shop_key gate which gateway getPaymentGateway() selects — see
// payment.ts). Legacy's cash-receipts/nicepay-specific fields aren't ported
// (out of scope, see MIGRATION.md).
export type UpdatePaymentConfigInput = {
  paymentTypeB: boolean;
  paymentTypeC: boolean;
  paymentTypeH: boolean;
  paymentCp: string;
  paymentShopId: string;
  paymentShopKey: string;
  paymentBankInfo: string;
};

export async function updatePaymentConfig(input: UpdatePaymentConfigInput): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 1 },
    data: {
      payment_type_b: input.paymentTypeB ? 1 : 0,
      payment_type_c: input.paymentTypeC ? 1 : 0,
      payment_type_h: input.paymentTypeH ? 1 : 0,
      payment_cp: input.paymentCp,
      payment_shop_id: input.paymentShopId,
      payment_shop_key: input.paymentShopKey,
      payment_bank_info: input.paymentBankInfo,
    },
  });
}

// Port of managers/config/goods_info.php, scoped down to the fields with a
// real consumer in this migration: price limits (already read via
// getShopConfig/priceLimitConfigFrom), the 4 shop-wide policy guide texts
// (detail.ts falls back to these for direct/직영 products — vendor.ts's
// VendorConfiguration already has the per-vendor equivalent), and the
// naver/daum shopping-feed toggles (app/feed/{naver,daum}/route.ts, added
// alongside this screen in Group I — these two were dead config until now).
// Left out: goods_soldout (no listing query in this repo branches on it —
// wiring it would mean threading a config value through every
// VISIBLE_GOODS_WHERE call site for a display toggle nothing currently
// reads, out of proportion to the value), the option/brand/make/origin
// master lists (GoodsForm's brand/origin stay free text, same reasoning as
// vendor.ts's H5 comment), and goods_require_info/goods_icon_info (neither
// has any admin/vendor form field that could consume them — see
// goods-excel-import.ts's comment on the same gap for require_info).
export type UpdateGoodsConfigInput = {
  priceLimit1: number;
  priceLimit2: number;
  engineNaver: boolean;
  engineDaum: boolean;
  deliveryInfo: string;
  refundInfo: string;
  exchangeInfo: string;
  asInfo: string;
};

// Read side is just getShopConfig()'s goodsPriceLimit1/2,
// goodsEngineNaver/goodsEngineDaum, and
// goodsDeliveryInfo/goodsRefundInfo/goodsExchangeInfo/goodsAsInfo fields —
// no separate getter needed.
export async function updateGoodsConfig(input: UpdateGoodsConfigInput): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 1 },
    data: {
      goods_price_limit1: input.priceLimit1,
      goods_price_limit2: input.priceLimit2,
      goods_engine_naver: input.engineNaver ? 1 : 0,
      goods_engine_daum: input.engineDaum ? 1 : 0,
      goods_delivery_info: sanitizeRichText(input.deliveryInfo),
      goods_refund_info: sanitizeRichText(input.refundInfo),
      goods_exchange_info: sanitizeRichText(input.exchangeInfo),
      goods_as_info: sanitizeRichText(input.asInfo),
    },
  });
}
