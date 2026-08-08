"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { replyToCounselAction, type ReplyState } from "@/app/(protected)/board/actions";

export function ReplyForm({ postUid }: { postUid: number }) {
  const [state, formAction, pending] = useActionState<ReplyState, FormData>(replyToCounselAction, {});
  const router = useRouter();
  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) router.refresh();
    prevPending.current = pending;
  }, [pending, state.error, router]);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500 }}>
      <input type="hidden" name="postUid" value={postUid} />
      <textarea name="content" placeholder="답변 내용을 입력해 주세요." rows={4} required />
      {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        답변 등록
      </button>
    </form>
  );
}
