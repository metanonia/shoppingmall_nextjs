"use client";

import { useActionState } from "react";
import type { AdminCategoryNode, AdminGoodsDetail, VendorOption } from "@shoppingmall/core";
import { createGoodsAction, updateGoodsAction, type ActionState } from "@/app/(protected)/goods/actions";
import { imageUrl } from "@/lib/image-url";

function flattenTree(nodes: AdminCategoryNode[], depth = 0): { node: AdminCategoryNode; depth: number }[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenTree(node.children, depth + 1)]);
}

type GoodsFormAction = (prevState: ActionState, formData: FormData) => Promise<ActionState>;

// Shared by both admin (/goods) and vendor (/vendor/goods) pages — the only
// difference is which server actions get called and whether the vendor
// picker is editable. `vendorLocked` (passed by the vendor pages) hides the
// <select> and pins the field to the caller's own vendor id via a hidden
// input instead — the actual server-side enforcement lives in
// app/vendor/(protected)/goods/actions.ts, this is just the matching UI.
export function GoodsForm({
  initial,
  categoryTree,
  vendors,
  actions,
  vendorLocked,
  masterValues,
}: {
  initial: AdminGoodsDetail | null;
  categoryTree: AdminCategoryNode[];
  vendors: VendorOption[];
  actions?: { create: GoodsFormAction; update: GoodsFormAction };
  vendorLocked?: string;
  // Vendor's own brand/제조사/원산지 suggestion lists (settings/store, H5) —
  // <datalist> only, not an enforced picker, so admin (no masterValues
  // passed) keeps the plain free-text fields it's always had.
  masterValues?: { brands: string[]; makes: string[]; origins: string[] };
}) {
  const action = initial ? (actions?.update ?? updateGoodsAction) : (actions?.create ?? createGoodsAction);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const flatCategories = flattenTree(categoryTree);
  const selectedCates = new Set((initial?.cateList ?? []).map((c) => c.toString()));

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
      {initial && <input type="hidden" name="uid" value={initial.uid} />}
      {initial && <input type="hidden" name="existingImage1" value={initial.image1} />}
      {initial && <input type="hidden" name="existingImage2" value={initial.image2} />}
      {initial && <input type="hidden" name="existingImage3" value={initial.image3} />}
      {initial?.otherImages.map((f) => <input key={f} type="hidden" name="existingOtherImages" value={f} />)}
      {initial?.detailImages.map((f) => <input key={f} type="hidden" name="existingDetailImages" value={f} />)}

      <fieldset>
        <legend>분류</legend>
        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #eee", padding: 8 }}>
          {flatCategories.map(({ node, depth }) => (
            <label key={node.uid} style={{ display: "block", paddingLeft: depth * 16 }}>
              <input type="checkbox" name="cateList" value={node.cate} defaultChecked={selectedCates.has(node.cate)} /> {node.name}
              <label style={{ marginLeft: 8, fontSize: 11, color: "#999" }}>
                <input type="radio" name="repCate" value={node.cate} defaultChecked={initial?.repCate?.toString() === node.cate} /> 대표
              </label>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>기본정보</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {vendorLocked ? (
            <input type="hidden" name="vendor" value={vendorLocked} />
          ) : (
            <select name="vendor" defaultValue={initial?.vendor ?? ""}>
              <option value="">직영 (입점사 없음)</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <input type="text" name="name" placeholder="상품명" defaultValue={initial?.name} required />
          <input type="text" name="name_code_able" placeholder="검색용 상품명(선택)" defaultValue={initial?.name_code_able} />
          <input type="text" name="goods_code" placeholder="자체상품코드" defaultValue={initial?.goods_code} />
          <div style={{ display: "flex", gap: 6 }}>
            <input type="number" name="price" placeholder="판매가" defaultValue={initial?.price} required />
            <input type="number" name="orig_price" placeholder="할인전가격" defaultValue={initial?.orig_price} />
            <input type="number" name="consumer_price" placeholder="소비자가" defaultValue={initial?.consumer_price} />
          </div>
          <input type="text" name="price_ment" placeholder="가격 대체문구(예: 상담 후 결정)" defaultValue={initial?.price_ment} />
          <div style={{ display: "flex", gap: 6 }}>
            <input type="text" name="model" placeholder="모델명" defaultValue={initial?.model} />
            <input type="text" name="brand" placeholder="브랜드" defaultValue={initial?.brand} list={masterValues ? "brandOptions" : undefined} />
            <input type="text" name="make" placeholder="제조사" defaultValue={initial?.make} list={masterValues ? "makeOptions" : undefined} />
            <input type="text" name="origin" placeholder="원산지" defaultValue={initial?.origin} list={masterValues ? "originOptions" : undefined} />
          </div>
          {masterValues && (
            <>
              <datalist id="brandOptions">
                {masterValues.brands.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <datalist id="makeOptions">
                {masterValues.makes.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <datalist id="originOptions">
                {masterValues.origins.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>이미지</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(["image1", "image2", "image3"] as const).map((key, i) => {
            const existing = initial ? (initial as unknown as Record<string, string>)[key] : "";
            return (
              <label key={key}>
                대표이미지{i + 1}
                <input type="file" name={key} accept="image/*" />
                {existing && <img src={imageUrl("goods", existing)} alt="" style={{ height: 40, marginLeft: 8, verticalAlign: "middle" }} />}
              </label>
            );
          })}
          <label>
            추가이미지 (복수 선택)
            <input type="file" name="otherImages" accept="image/*" multiple />
          </label>
          <label>
            상세이미지 (복수 선택, 위→아래로 이어붙여 출력)
            <input type="file" name="detailImages" accept="image/*" multiple />
          </label>
          <label>
            <input type="checkbox" name="detail_image_only" defaultChecked={initial?.detail_image_only} /> 상세페이지를 이미지로만 구성
          </label>
          <label>
            <input type="radio" name="detail_image_type" value={1} defaultChecked={(initial?.detail_image_type ?? 1) === 1} /> 이미지 간 여백 있음
          </label>
          <label>
            <input type="radio" name="detail_image_type" value={2} defaultChecked={initial?.detail_image_type === 2} /> 이미지 간 여백 없음
          </label>
          <textarea name="explains" placeholder="상품 요약설명" defaultValue={initial?.explains} rows={2} />
          <textarea name="detail" placeholder="상세설명(HTML)" defaultValue={initial?.detail} rows={6} />
        </div>
      </fieldset>

      <fieldset>
        <legend>재고/판매</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>
            <input type="radio" name="qty_type" value={0} defaultChecked={(initial?.qty_type ?? 0) === 0} /> 재고 수량 관리
            <input type="number" name="qty" placeholder="재고수량" defaultValue={initial?.qty} style={{ marginLeft: 8, width: 100 }} />
          </label>
          <label>
            <input type="radio" name="qty_type" value={1} defaultChecked={initial?.qty_type === 1} /> 품절 걱정 없음(무제한)
          </label>
          <input type="number" name="limit_qty" placeholder="1인당 구매제한 수량(0=제한없음)" defaultValue={initial?.limit_qty} />
          <label>
            <input type="checkbox" name="display_use" defaultChecked={initial?.display_use ?? true} /> 진열함
          </label>
          <label>
            <input type="checkbox" name="sale_use" defaultChecked={initial?.sale_use ?? true} /> 판매함
          </label>
          <label>
            <input type="checkbox" name="option_use" defaultChecked={initial?.option_use} /> 옵션 사용 (아래 옵션빌더에서 옵션품목 생성 필요)
          </label>
          <input type="number" name="order_priority" placeholder="진열순서(작을수록 먼저 노출)" defaultValue={initial?.order_priority ?? 5} />
          <label>
            <input type="checkbox" name="cate_hide" defaultChecked={initial?.cate_hide} /> 카테고리 목록에서 숨김
          </label>
          <label>
            <input type="checkbox" name="vendor_hide" defaultChecked={initial?.vendor_hide} /> 입점사 스토어에서 숨김
          </label>
          <label>
            <input type="checkbox" name="engine_use" defaultChecked={initial ? initial.engine_use : true} /> 쇼핑 검색 노출(네이버/다음 피드 — 설정에서 채널별로도 켜야 함)
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>마일리지/배송</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label>
            <input type="radio" name="mileage_type" value={0} defaultChecked={(initial?.mileage_type ?? 0) === 0} /> 마일리지 없음
          </label>
          <label>
            <input type="radio" name="mileage_type" value={4} defaultChecked={initial?.mileage_type === 4} /> 공통 적립률(%)
            <input type="number" name="mileage_common" defaultValue={initial?.mileage_common} style={{ marginLeft: 8, width: 80 }} />
          </label>
          <select name="delivery_type" defaultValue={initial?.delivery_type ?? 1}>
            <option value={1}>기본 배송정책 따름</option>
            <option value={2}>무료배송</option>
            <option value={3}>착불</option>
            <option value={4}>고정배송비</option>
            <option value={5}>개당 고정배송비</option>
          </select>
          <input type="number" name="delivery_price" placeholder="배송비(고정 배송비 선택 시)" defaultValue={initial?.delivery_price} />
          <textarea name="delivery_info" placeholder="배송안내" defaultValue={initial?.delivery_info} rows={2} />
          <textarea name="refund_info" placeholder="환불안내" defaultValue={initial?.refund_info} rows={2} />
          <textarea name="exchange_info" placeholder="교환안내" defaultValue={initial?.exchange_info} rows={2} />
          <textarea name="as_info" placeholder="A/S안내" defaultValue={initial?.as_info} rows={2} />
        </div>
      </fieldset>

      <fieldset>
        <legend>기타</legend>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input type="text" name="icons" placeholder="아이콘 코드(쉼표로 구분, 예: new,best)" defaultValue={initial?.icons.join(",")} />
          <input type="text" name="keyword" placeholder="검색 키워드(쉼표로 구분)" defaultValue={initial?.keyword} />
          <div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>제작정보 (최대 5개)</div>
            {[0, 1, 2, 3, 4].map((i) => {
              const m = initial?.makingInfo[i];
              return (
                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <input type="text" name={`makingName${i}`} placeholder="항목명" defaultValue={m?.name} style={{ width: 120 }} />
                  <input type="text" name={`makingValue${i}`} placeholder="내용" defaultValue={m?.value} style={{ flex: 1 }} />
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>

      {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "저장 중..." : initial ? "수정 저장" : "상품 등록"}
      </button>
    </form>
  );
}
