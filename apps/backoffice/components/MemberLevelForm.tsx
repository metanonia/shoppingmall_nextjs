"use client";

import { useActionState } from "react";
import type { AdminMemberListItem } from "@shoppingmall/core";
import { changeMemberLevelAction, type ActionState } from "@/app/(protected)/members/actions";

export function MemberLevelForm({ members }: { members: AdminMemberListItem[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changeMemberLevelAction, {});

  return (
    <form action={formAction}>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th></th>
            <th>아이디</th>
            <th>이름</th>
            <th>이메일</th>
            <th>연락처</th>
            <th>등급</th>
            <th>마일리지</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                <input type="checkbox" name="memberId" value={m.id} />
              </td>
              <td>
                <a href={`/members/${m.id}`}>{m.id}</a>
              </td>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>{m.cell}</td>
              <td>{m.level}</td>
              <td>{m.mileage.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <span>선택 회원 등급 변경:</span>
        <input type="number" name="newLevel" placeholder="등급" style={{ width: 80 }} />
        <button type="submit" disabled={pending}>
          적용
        </button>
        {state.error && <span style={{ color: "#e02020", fontSize: 12 }}>{state.error}</span>}
      </div>
    </form>
  );
}
