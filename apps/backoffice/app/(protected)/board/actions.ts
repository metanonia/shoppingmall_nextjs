"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createComment, createPost, deletePost, isBoardId, updatePost } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string };

export async function createBoardPostAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const boardId = String(formData.get("boardId") ?? "");
  if (!isBoardId(boardId)) return { error: "존재하지 않는 게시판입니다." };

  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = formData.get("category") ? Number(formData.get("category")) : undefined;
  const notice = formData.get("notice") === "on";

  const result = await createPost(
    boardId,
    { memberId: session.userId, memberName: "관리자" },
    { subject, content, category },
    { actingAsAdmin: true },
  );
  if (!result.ok) return { error: result.error };

  if (notice) await updatePost(result.uid, { subject, content, category, notice: true });

  revalidatePath(`/board/${boardId}`);
  redirect(`/board/${boardId}`);
}

export async function updateBoardPostAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const boardId = String(formData.get("boardId") ?? "");
  const uid = Number(formData.get("uid"));
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = formData.get("category") ? Number(formData.get("category")) : undefined;
  const notice = formData.get("notice") === "on";

  const result = await updatePost(uid, { subject, content, category, notice });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/board/${boardId}`);
  redirect(`/board/${boardId}`);
}

export async function deleteBoardPostAction(formData: FormData): Promise<void> {
  const boardId = String(formData.get("boardId") ?? "");
  const uid = Number(formData.get("uid"));
  await deletePost(uid);
  revalidatePath(`/board/${boardId}`);
  redirect(`/board/${boardId}`);
}

export type ReplyState = { error?: string };

export async function replyToCounselAction(_prevState: ReplyState, formData: FormData): Promise<ReplyState> {
  const session = await requireAdmin();
  const postUid = Number(formData.get("postUid"));
  const content = String(formData.get("content") ?? "").trim();

  const result = await createComment(
    "counsel",
    postUid,
    { memberId: session.userId, memberName: "관리자" },
    content,
    { actingAsAdmin: true },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/board/counsel/${postUid}`);
  revalidatePath("/board/counsel");
  return {};
}
