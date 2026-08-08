"use client";

import { useActionState, useState } from "react";
import type { MemberLevelListItem } from "@shoppingmall/core";
import {
  createMemberLevelAction,
  deleteMemberLevelAction,
  recalculateMemberLevelsAction,
  updateMemberLevelAction,
  type ActionState,
  type RecalculateState,
} from "@/app/(protected)/settings/member-levels/actions";

// A <form> can't be a direct child of <tr> — the browser silently
// reparents it, which used to hide every cell in the row (this repo hit the
// same nested-form class of bug in Phase 7, see MIGRATION.md). <form> IS
// valid flow content inside a <td> though, so each row's (empty, id-only)
// form lives in the first cell and every other cell's input/button
// associates to it via the HTML5 `form` attribute instead of nesting.
function LevelRow({ level }: { level: MemberLevelListItem }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateMemberLevelAction, {});
  const formId = `member-level-${level.uid}`;

  return (
    <tr>
      <td>
        {level.level}
        <form id={formId} action={formAction}>
          <input type="hidden" name="uid" value={level.uid} />
        </form>
      </td>
      <td>
        <input type="text" name="name" form={formId} defaultValue={level.name} style={{ width: 100 }} />
      </td>
      <td>
        <input type="number" name="discount" form={formId} defaultValue={level.discount} style={{ width: 70 }} />%
      </td>
      <td>
        <input type="number" name="mileage" form={formId} defaultValue={level.mileage} style={{ width: 70 }} />%
      </td>
      <td>
        <input type="checkbox" name="deliveryFree" form={formId} defaultChecked={level.deliveryFree} />
      </td>
      <td>
        <input type="number" name="price" form={formId} defaultValue={level.price} style={{ width: 100 }} />원
      </td>
      <td>
        <input type="number" name="couponUid" form={formId} defaultValue={level.couponUid || ""} placeholder="쿠폰UID" style={{ width: 70 }} />
      </td>
      <td>{level.memberCount}명</td>
      <td>
        <button type="submit" form={formId} disabled={pending}>
          저장
        </button>
      </td>
      <td>
        <form action={deleteMemberLevelAction}>
          <input type="hidden" name="uid" value={level.uid} />
          <button type="submit">삭제</button>
        </form>
      </td>
      {state.error && (
        <td colSpan={10} style={{ color: "#e02020" }}>
          {state.error}
        </td>
      )}
    </tr>
  );
}

function NewLevelRow() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createMemberLevelAction, {});
  const formId = "member-level-new";

  return (
    <tr>
      <td>
        신규
        <form id={formId} action={formAction} />
      </td>
      <td>
        <input type="text" name="name" form={formId} placeholder="등급명" style={{ width: 100 }} required />
      </td>
      <td>
        <input type="number" name="discount" form={formId} defaultValue={0} style={{ width: 70 }} />%
      </td>
      <td>
        <input type="number" name="mileage" form={formId} defaultValue={0} style={{ width: 70 }} />%
      </td>
      <td>
        <input type="checkbox" name="deliveryFree" form={formId} />
      </td>
      <td>
        <input type="number" name="price" form={formId} defaultValue={0} style={{ width: 100 }} />원
      </td>
      <td>
        <input type="number" name="couponUid" form={formId} placeholder="쿠폰UID" style={{ width: 70 }} />
      </td>
      <td>-</td>
      <td>
        <button type="submit" form={formId} disabled={pending}>
          추가
        </button>
      </td>
      {state.error && (
        <td colSpan={9} style={{ color: "#e02020" }}>
          {state.error}
        </td>
      )}
    </tr>
  );
}

export function MemberLevelTable({ levels }: { levels: MemberLevelListItem[] }) {
  return (
    <table style={{ width: "100%" }}>
      <thead>
        <tr>
          <th>등급</th>
          <th>등급명</th>
          <th>할인율</th>
          <th>적립률</th>
          <th>무료배송</th>
          <th>자동승급 기준금액</th>
          <th>승급쿠폰</th>
          <th>회원수</th>
          <th colSpan={2}></th>
        </tr>
      </thead>
      <tbody>
        {levels.map((l) => (
          <LevelRow key={l.uid} level={l} />
        ))}
        <NewLevelRow />
      </tbody>
    </table>
  );
}

export function RecalculateLevelsForm() {
  const [state, formAction, pending] = useActionState<RecalculateState, FormData>(recalculateMemberLevelsAction, {});
  const [defaultDates] = useState(() => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);
    return { today: today.toISOString().slice(0, 10), monthAgo: monthAgo.toISOString().slice(0, 10) };
  });

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="date" name="dateFrom" defaultValue={defaultDates.monthAgo} />
      ~
      <input type="date" name="dateTo" defaultValue={defaultDates.today} />
      <button type="submit" disabled={pending}>
        {pending ? "산정 중..." : "자동등급 일괄산정 실행"}
      </button>
      {state.error && <span style={{ color: "#e02020" }}>{state.error}</span>}
      {state.result && (
        <span style={{ color: "#2a8f2a" }}>
          평가 {state.result.evaluatedCount}명 중 {state.result.changedCount}명 등급 변경, 쿠폰 {state.result.couponsIssued}건 발급
        </span>
      )}
    </form>
  );
}
