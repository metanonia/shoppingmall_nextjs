"use client";

import { useActionState } from "react";
import type { BoardId } from "@shoppingmall/core";
import { createBoardPostAction, updateBoardPostAction, type ActionState } from "@/app/(protected)/board/actions";

export function BoardPostForm({
  boardId,
  categories,
  initial,
}: {
  boardId: BoardId;
  categories: readonly string[] | null;
  initial: { uid: number; subject: string; content: string; category: number; notice: boolean } | null;
}) {
  const action = initial ? updateBoardPostAction : createBoardPostAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 600 }}>
      <input type="hidden" name="boardId" value={boardId} />
      {initial && <input type="hidden" name="uid" value={initial.uid} />}
      {categories && (
        <select name="category" defaultValue={initial?.category ?? 0}>
          {categories.map((c, i) => (
            <option key={c} value={i}>
              {c}
            </option>
          ))}
        </select>
      )}
      <label>
        <input type="checkbox" name="notice" defaultChecked={initial?.notice} /> 상단 고정
      </label>
      <input type="text" name="subject" placeholder="제목" defaultValue={initial?.subject} required />
      <textarea name="content" placeholder="내용" defaultValue={initial?.content} rows={10} required />
      {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {initial ? "수정 저장" : "등록"}
      </button>
    </form>
  );
}
