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
    goodsSoldout: row.goods_soldout,
    goodsOptionInfo: row.goods_option_info.split("|*|").map((value) => value.trim()).filter(Boolean),
    goodsBrandInfo: row.goods_brand_info.split("|*|").map((value) => value.trim()).filter(Boolean),
    goodsMakeInfo: row.goods_make_info.split("|*|").map((value) => value.trim()).filter(Boolean),
    goodsOriginInfo: row.goods_origin_info.split("|*|").map((value) => value.trim()).filter(Boolean),
    goodsRequireInfo: row.goods_require_info,
    goodsIconInfo: row.goods_icon_info.split("|").map((value) => value.trim()).filter(Boolean),
    goodsEngineNaver: row.goods_engine_naver === 1,
    goodsEngineDaum: row.goods_engine_daum === 1,
    goodsDeliveryInfo: row.goods_delivery_info,
    goodsRefundInfo: row.goods_refund_info,
    goodsExchangeInfo: row.goods_exchange_info,
    goodsAsInfo: row.goods_as_info,
    paymentBankInfo: row.payment_bank_info,
    paymentTypeB: row.payment_type_b,
    paymentTypeC: row.payment_type_c,
    paymentTypeR: row.payment_type_r,
    paymentTypeV: row.payment_type_v,
    paymentTypeH: row.payment_type_h,
    paymentCp: row.payment_cp,
    paymentShopId: row.payment_shop_id,
    paymentShopKey: row.payment_shop_key,
    paymentCommissionC: row.payment_commission_c,
    paymentCommissionH: row.payment_commission_h,
    cashReceiptsUsed: row.cash_receipts_used === 1,
    cashReceiptsRequired: row.cash_receipts_require === 1,
    cashReceiptsMethod: row.cash_receipts_method,
    cashReceiptsType: row.cash_receipts_type,
    naverPayUsed: row.naverpay_used === 1,
    naverPayMode: row.naverpay_mode,
    naverPayTestId: row.naverpay_test_id,
    naverPayShopId: row.naverpay_shop_id,
    naverPayCertKey: row.naverpay_key1,
    naverPayButtonKey: row.naverpay_key2,
    naverPayCommonKey: row.naverpay_key3,
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
    deliveryCompanies: row.delivery_info.split("|*|").slice(1).map((value) => value.split("|")).filter((value) => value[1] && value[3] === "1").map((value) => value[1]),
    orderCancelInfo: row.order_cancel_info,
    orderMessageInfo: row.order_message_info,
    orderAutoCompleted1: row.order_auto_completed1,
    orderAutoCompleted2: row.order_auto_completed2,
    orderAutoCompleted3: row.order_auto_completed3,
    orderTrackerEnabled: row.order_tracker_yn === "Y",
    orderTrackerKey: row.order_tracker_key,
    memberMileageValidityYn: row.member_mileage_validity_yn,
    memberMileageValidity: row.member_mileage_validity,
    memberMileageValidityType: row.member_mileage_validity_type,
    inquiryAccessWrite: row.inquiry_access_write,
    inquirySecretType: row.inquiry_secret_type,
    inquiryPrivacyType: row.inquiry_privacy_type,
    inquiryCategoryInfo: row.inquiry_cate_info,
    inquiryGuestAgreement: row.agreement_info5,
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
  orderCancelInfo: string;
  orderMessageInfo: string;
  orderAutoCompleted1: number;
  orderAutoCompleted2: number;
  orderAutoCompleted3: number;
  orderTrackerEnabled: boolean;
  orderTrackerKey: string;
};

export async function updateDeliveryConfig(input: UpdateDeliveryConfigInput): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 1 },
    data: {
      delivery_type: input.deliveryType,
      delivery_d_price: input.deliveryDPrice,
      delivery_p_price1: input.deliveryPPrice1,
      delivery_p_price2: input.deliveryPPrice2,
      order_cancel_info: input.orderCancelInfo,
      order_message_info: input.orderMessageInfo,
      order_auto_completed1: input.orderAutoCompleted1,
      order_auto_completed2: input.orderAutoCompleted2,
      order_auto_completed3: input.orderAutoCompleted3,
      order_tracker_yn: input.orderTrackerEnabled ? "Y" : "N",
      order_tracker_key: input.orderTrackerKey,
    },
  });
}

export type UpdatePaymentConfigInput = {
  paymentTypeB: boolean;
  paymentTypeC: boolean;
  paymentTypeR: boolean;
  paymentTypeV: boolean;
  paymentTypeH: boolean;
  paymentCp: string;
  paymentShopId: string;
  paymentShopKey: string;
  paymentBankInfo: string;
  cashReceiptsUsed: boolean;
  cashReceiptsRequired: boolean;
  cashReceiptsMethod: number;
  cashReceiptsType: number;
  naverPayUsed: boolean;
  naverPayMode: number;
  naverPayTestId: string;
  naverPayShopId: string;
  naverPayCertKey: string;
  naverPayButtonKey: string;
  naverPayCommonKey: string;
};

export async function updatePaymentConfig(input: UpdatePaymentConfigInput): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 1 },
    data: {
      payment_type_b: input.paymentTypeB ? 1 : 0,
      payment_type_c: input.paymentTypeC ? 1 : 0,
      payment_type_r: input.paymentTypeR ? 1 : 0,
      payment_type_v: input.paymentTypeV ? 1 : 0,
      payment_type_h: input.paymentTypeH ? 1 : 0,
      payment_cp: input.paymentCp,
      payment_shop_id: input.paymentShopId,
      payment_shop_key: input.paymentShopKey,
      payment_bank_info: input.paymentBankInfo,
      cash_receipts_used: input.cashReceiptsUsed ? 1 : 0,
      cash_receipts_require: input.cashReceiptsRequired ? 1 : 0,
      cash_receipts_method: input.cashReceiptsMethod,
      cash_receipts_type: input.cashReceiptsType,
      naverpay_used: input.naverPayUsed ? 1 : 0,
      naverpay_mode: input.naverPayMode === 1 ? 1 : 0,
      naverpay_test_id: input.naverPayTestId,
      naverpay_shop_id: input.naverPayShopId,
      naverpay_key1: input.naverPayCertKey,
      naverpay_key2: input.naverPayButtonKey,
      naverpay_key3: input.naverPayCommonKey,
    },
  });
}

// Port of managers/config/goods_info.php. The listing consumer applies the
// same three-way sold-out policy as php/list.php, search.php and store.php.
export type UpdateGoodsConfigInput = {
  priceLimit1: number;
  priceLimit2: number;
  goodsSoldout: 0 | 1 | 2;
  optionInfo: string[];
  brandInfo: string[];
  makeInfo: string[];
  originInfo: string[];
  requireInfo: string;
  iconInfo: string[];
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
      goods_soldout: input.goodsSoldout,
      goods_option_info: input.optionInfo.join("|*|"),
      goods_brand_info: input.brandInfo.join("|*|"),
      goods_make_info: input.makeInfo.join("|*|"),
      goods_origin_info: input.originInfo.join("|*|"),
      goods_require_info: input.requireInfo,
      goods_icon_info: input.iconInfo.join("|"),
      goods_engine_naver: input.engineNaver ? 1 : 0,
      goods_engine_daum: input.engineDaum ? 1 : 0,
      goods_delivery_info: sanitizeRichText(input.deliveryInfo),
      goods_refund_info: sanitizeRichText(input.refundInfo),
      goods_exchange_info: sanitizeRichText(input.exchangeInfo),
      goods_as_info: sanitizeRichText(input.asInfo),
    },
  });
}

export async function updateGoodsIconInfo(iconInfo: string[]): Promise<void> {
  const unique = Array.from(new Set(iconInfo.map((name) => name.trim()).filter(Boolean)));
  await prisma.configuration.update({ where: { uid: 1 }, data: { goods_icon_info: unique.join("|") } });
}
