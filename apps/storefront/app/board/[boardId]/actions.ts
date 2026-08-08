"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BOARD_CONFIG,
  type PostComment,
  type PostDetail,
  createComment,
  createPost,
  deleteOwnPost,
  deleteOwnComment,
  getMemberProfile,
  getPostComments,
  getPostDetail,
  isCustomerBoardId,
  setPostFiles,
  updateOwnPost,
} from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { saveBoardFiles } from "@/lib/board-upload";

export type CreatePostFormState = { error?: string };

// Port of board/board_post.php's write path. Files are saved to disk under
// the post's own uid *after* the post row exists (see board-upload.ts) —
// post is created with an empty `files` column first, then setPostFiles
// attaches the resulting filenames once they're on disk.
export async function createPostAction(_prevState: CreatePostFormState, formData: FormData): Promise<CreatePostFormState> {
  const boardId = String(formData.get("boardId") ?? "");
  if (!isCustomerBoardId(boardId)) return { error: "존재하지 않는 게시판입니다." };

  const config = BOARD_CONFIG[boardId];
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = formData.get("category") ? Number(formData.get("category")) : undefined;
  const contact = String(formData.get("contact") ?? "").trim();
  const secret = formData.get("secret") === "on";

  const session = await getSession();
  let author: Parameters<typeof createPost>[1];
  if (session) {
    const profile = await getMemberProfile(session.userId);
    if (!profile) return { error: "회원 정보를 확인할 수 없습니다." };
    author = { memberId: session.userId, memberName: profile.name };
  } else {
    const guestName = String(formData.get("guestName") ?? "").trim();
    const guestPasswordPlain = String(formData.get("guestPasswd") ?? "");
    if (!guestName || !guestPasswordPlain) return { error: "이름과 비밀번호를 입력해 주세요." };
    author = { guestName, guestPasswordPlain };
  }

  const result = await createPost(boardId, author, { subject, content, category, contact, secret });
  if (!result.ok) return { error: result.error };

  if (config.hasFiles) {
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 0) {
      const saved = await saveBoardFiles(boardId, result.uid, files);
      if (!saved.ok) return { error: saved.error };
      await setPostFiles(result.uid, saved.filenames);
    }
  }

  revalidatePath(`/board/${boardId}`);
  redirect(`/board/${boardId}/${result.uid}`);
}

export type UnlockPostFormState = { error?: string; detail?: PostDetail; comments?: PostComment[] };

// Guest twin of a member's automatic ownership unlock in getPostDetail —
// used by SecretPostGate.tsx when the page's initial (unauthenticated)
// fetch came back blanked. incrementView:false so repeated wrong guesses
// don't inflate the counter beyond the one increment from the page load.
// Also returns comments (the admin's counsel reply, if any) since the
// parent page's own comment fetch only runs for the server-side-viewable
// case and never sees this client-side unlock.
export async function unlockSecretPostAction(_prevState: UnlockPostFormState, formData: FormData): Promise<UnlockPostFormState> {
  const boardId = String(formData.get("boardId") ?? "");
  if (!isCustomerBoardId(boardId)) return { error: "존재하지 않는 게시판입니다." };

  const uid = Number(formData.get("uid"));
  const guestPasswordPlain = String(formData.get("guestPasswd") ?? "");
  if (!guestPasswordPlain) return { error: "비밀번호를 입력해 주세요." };

  const detail = await getPostDetail(boardId, uid, { guestPasswordPlain }, { incrementView: false });
  if (!detail || !detail.viewable) return { error: "비밀번호가 일치하지 않습니다." };

  const comments = BOARD_CONFIG[boardId].comments ? await getPostComments(uid) : [];
  return { detail, comments };
}

export type CreateCommentFormState = { error?: string; success?: boolean };

export async function createCommentAction(_prevState: CreateCommentFormState, formData: FormData): Promise<CreateCommentFormState> {
  const boardId = String(formData.get("boardId") ?? "");
  if (!isCustomerBoardId(boardId)) return { error: "존재하지 않는 게시판입니다." };

  const postUid = Number(formData.get("postUid"));
  const content = String(formData.get("content") ?? "").trim();

  const session = await getSession();
  let author: Parameters<typeof createComment>[2];
  if (session) {
    const profile = await getMemberProfile(session.userId);
    if (!profile) return { error: "회원 정보를 확인할 수 없습니다." };
    author = { memberId: session.userId, memberName: profile.name };
  } else {
    const guestName = String(formData.get("guestName") ?? "").trim();
    const guestPasswordPlain = String(formData.get("guestPasswd") ?? "");
    if (!guestName || !guestPasswordPlain) return { error: "이름과 비밀번호를 입력해 주세요." };
    author = { guestName, guestPasswordPlain };
  }

  const parentUid = Number(formData.get("parentUid") ?? 0);
  const result = await createComment(boardId, postUid, author, content, { parentUid: parentUid > 0 ? parentUid : undefined });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/board/${boardId}/${postUid}`);
  return { success: true };
}

export type ManagePostFormState = { error?: string; success?: boolean };

async function ownerAuth(formData: FormData) {
  const session = await getSession();
  return session
    ? { memberId: session.userId }
    : { guestPasswordPlain: String(formData.get("guestPasswd") ?? "") };
}

export async function updateOwnPostAction(
  _prevState: ManagePostFormState,
  formData: FormData,
): Promise<ManagePostFormState> {
  const boardId = String(formData.get("boardId") ?? "");
  if (!isCustomerBoardId(boardId)) return { error: "존재하지 않는 게시판입니다." };
  const uid = Number(formData.get("uid"));
  const result = await updateOwnPost(boardId, uid, await ownerAuth(formData), {
    subject: String(formData.get("subject") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim(),
    category: formData.get("category") ? Number(formData.get("category")) : undefined,
    secret: formData.get("secret") === "on",
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/board/${boardId}/${uid}`);
  redirect(`/board/${boardId}/${uid}`);
}

export async function deleteOwnPostAction(
  _prevState: ManagePostFormState,
  formData: FormData,
): Promise<ManagePostFormState> {
  const boardId = String(formData.get("boardId") ?? "");
  if (!isCustomerBoardId(boardId)) return { error: "존재하지 않는 게시판입니다." };
  const uid = Number(formData.get("uid"));
  const result = await deleteOwnPost(boardId, uid, await ownerAuth(formData));
  if (!result.ok) return { error: result.error };
  revalidatePath(`/board/${boardId}`);
  redirect(`/board/${boardId}`);
}

export async function deleteOwnCommentAction(
  _prevState: ManagePostFormState,
  formData: FormData,
): Promise<ManagePostFormState> {
  const boardId = String(formData.get("boardId") ?? "");
  if (!isCustomerBoardId(boardId)) return { error: "존재하지 않는 게시판입니다." };
  const postUid = Number(formData.get("postUid"));
  const result = await deleteOwnComment(
    boardId,
    postUid,
    Number(formData.get("commentUid")),
    await ownerAuth(formData),
  );
  if (!result.ok) return { error: result.error };
  revalidatePath(`/board/${boardId}/${postUid}`);
  return { success: true };
}
