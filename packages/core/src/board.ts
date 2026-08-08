import { prisma } from "@shoppingmall/db";
import { hashPassword, verifyPassword } from "@shoppingmall/auth";
import { sendPushNotification } from "./push";

export type BoardId = "notice" | "faq" | "counsel" | "gallery" | "vnotice" | "vcounsel";
export type CustomerBoardId = Exclude<BoardId, "vnotice" | "vcounsel">;

export type BoardConfigEntry = {
  name: string;
  writable: boolean;
  secretType: "none" | "optional" | "always";
  categories: readonly string[] | null;
  comments: boolean;
  // Who's allowed to write a comment on this board, when comments=true.
  // gallery: any customer (member or guest) — legacy's actual customer-facing
  // comment feature. counsel: admin-only — this is really "관리자 답변", not
  // a customer discussion thread, reusing the comment mechanism the same way
  // legacy's board_post.php does (see createComment's comment below).
  commentAuthor: "customer" | "admin" | null;
  hasFiles: boolean;
  hasContact: boolean;
};

// Port of board/board.php's per-board access config (mallRN_board_manager),
// hardcoded since there's no admin UI to manage it yet. Customer routes
// explicitly accept only CustomerBoardId; vnotice/vcounsel are exposed only
// through the role-protected admin/vendor backoffice routes.
export const BOARD_CONFIG: Record<BoardId, BoardConfigEntry> = {
  notice: {
    name: "공지사항",
    writable: false,
    secretType: "optional",
    categories: null,
    comments: false,
    commentAuthor: null,
    hasFiles: false,
    hasContact: false,
  },
  faq: {
    name: "자주 찾는 질문",
    writable: false,
    secretType: "none",
    categories: ["주문/결제", "배송", "교환/반품/환불", "회원", "상품", "기타"],
    comments: false,
    commentAuthor: null,
    hasFiles: false,
    hasContact: false,
  },
  counsel: {
    name: "1:1 문의",
    writable: true,
    secretType: "always",
    categories: ["배송문의", "입금/계산서문의", "회원정보문의", "교환문의", "반품/취소문의"],
    comments: true,
    commentAuthor: "admin",
    hasFiles: false,
    hasContact: true,
  },
  gallery: {
    name: "갤러리",
    writable: true,
    secretType: "none",
    categories: null,
    comments: true,
    commentAuthor: "customer",
    hasFiles: true,
    hasContact: false,
  },
  vnotice: {
    name: "판매사 공지사항",
    writable: false,
    secretType: "none",
    categories: null,
    comments: false,
    commentAuthor: null,
    hasFiles: false,
    hasContact: false,
  },
  vcounsel: {
    name: "판매사 1:1문의",
    writable: true,
    secretType: "always",
    categories: null,
    comments: true,
    commentAuthor: "admin",
    hasFiles: false,
    hasContact: false,
  },
};

export function isBoardId(value: string): value is BoardId {
  return value in BOARD_CONFIG;
}

export function isCustomerBoardId(value: string): value is CustomerBoardId {
  return isBoardId(value) && value !== "vnotice" && value !== "vcounsel";
}

// Extracted so vitest can exercise the secretType decision without a DB.
export function resolveSecretFlag(secretType: BoardConfigEntry["secretType"], requested: boolean | undefined): boolean {
  if (secretType === "always") return true;
  if (secretType === "none") return false;
  return Boolean(requested);
}

// Extracted pagination clamp, same shape as listing.ts's runGoodsQuery.
export function clampPage(page: number, total: number, limit: number): { safePage: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return { safePage, totalPages };
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type PostAuthor = { memberId: string; memberName: string } | { guestName: string; guestPasswordPlain: string };

export type CreatePostInput = {
  subject: string;
  content: string;
  category?: number;
  contact?: string;
  secret?: boolean;
  files?: string[];
};

export type CreatePostResult = { ok: true; uid: number } | { ok: false; error: string };

// Port of board/board_post.php's write path. `actingAsAdmin` bypasses the
// `config.writable` gate for notice/faq — that flag means "customers can't
// write here", not "nobody can": the backoffice app writes notice/faq posts
// as an authenticated admin, using this same function rather than a
// parallel one.
export async function createPost(
  boardId: BoardId,
  author: PostAuthor,
  input: CreatePostInput,
  opts: { actingAsAdmin?: boolean } = {},
): Promise<CreatePostResult> {
  const config = BOARD_CONFIG[boardId];
  if (!config.writable && !opts.actingAsAdmin) return { ok: false, error: "글쓰기가 허용되지 않는 게시판입니다." };
  if (!input.subject.trim() || !input.content.trim()) return { ok: false, error: "제목과 내용을 입력해 주세요." };
  if (config.hasContact && !input.contact?.trim()) return { ok: false, error: "연락처를 입력해 주세요." };

  const id = "memberId" in author ? author.memberId : "";
  const name = "memberId" in author ? author.memberName : author.guestName;
  const passwd = "memberId" in author ? "" : await hashPassword(author.guestPasswordPlain);
  const secret = resolveSecretFlag(config.secretType, input.secret);

  const post = await prisma.boardPost.create({
    data: {
      board: boardId,
      category: input.category ?? 0,
      id,
      name,
      subject: input.subject,
      content: input.content,
      contact: input.contact ?? "",
      secret: secret ? 1 : 0,
      passwd,
      files: input.files?.join("|") ?? "",
      signdate: now(),
    },
  });
  if ((boardId === "counsel" || boardId === "vcounsel") && !opts.actingAsAdmin) {
    await sendPushNotification(boardId === "vcounsel" ? "신규 판매사 1:1문의 알림!" : "신규 1:1문의 알림!", `${name}님의 문의가 접수되었습니다.`).catch(() => {});
  }
  return { ok: true, uid: post.uid };
}

export type UpdatePostInput = { subject: string; content: string; category?: number; contact?: string; secret?: boolean; notice?: boolean };
export type UpdatePostResult = { ok: true } | { ok: false; error: string };

export async function updatePost(uid: number, input: UpdatePostInput): Promise<UpdatePostResult> {
  if (!input.subject.trim() || !input.content.trim()) return { ok: false, error: "제목과 내용을 입력해 주세요." };
  const updated = await prisma.boardPost.updateMany({
    where: { uid },
    data: {
      subject: input.subject,
      content: input.content,
      category: input.category ?? 0,
      ...(input.contact !== undefined ? { contact: input.contact } : {}),
      ...(input.secret !== undefined ? { secret: input.secret ? 1 : 0 } : {}),
      notice: input.notice ? 1 : 0,
    },
  });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 게시물입니다." };
  return { ok: true };
}

export async function deletePost(uid: number): Promise<void> {
  await prisma.$transaction([prisma.boardComment.deleteMany({ where: { post_uid: uid } }), prisma.boardPost.delete({ where: { uid } })]);
}

export type PostOwnerAuth = { memberId: string } | { guestPasswordPlain: string };

async function verifyPostOwner(boardId: BoardId, uid: number, auth: PostOwnerAuth) {
  const post = await prisma.boardPost.findFirst({ where: { uid, board: boardId } });
  if (!post) return { ok: false as const, error: "존재하지 않는 게시물입니다." };
  if ("memberId" in auth) {
    return post.id && post.id === auth.memberId
      ? { ok: true as const, post }
      : { ok: false as const, error: "작성자만 처리할 수 있습니다." };
  }
  if (post.id || !(await verifyPassword(post.passwd, auth.guestPasswordPlain))) {
    return { ok: false as const, error: "비밀번호가 일치하지 않습니다." };
  }
  return { ok: true as const, post };
}

// Port of board/board_post.php's customer modify/delete ownership checks.
export async function updateOwnPost(
  boardId: BoardId,
  uid: number,
  auth: PostOwnerAuth,
  input: UpdatePostInput,
): Promise<UpdatePostResult> {
  const ownership = await verifyPostOwner(boardId, uid, auth);
  if (!ownership.ok) return ownership;
  const config = BOARD_CONFIG[boardId];
  if (!config.writable) return { ok: false, error: "수정할 수 없는 게시판입니다." };
  if (config.hasContact && !input.contact?.trim()) return { ok: false, error: "연락처를 입력해 주세요." };
  return updatePost(uid, {
    ...input,
    secret: resolveSecretFlag(config.secretType, input.secret),
  });
}

export async function deleteOwnPost(boardId: BoardId, uid: number, auth: PostOwnerAuth): Promise<UpdatePostResult> {
  const ownership = await verifyPostOwner(boardId, uid, auth);
  if (!ownership.ok) return ownership;
  if (!BOARD_CONFIG[boardId].writable) return { ok: false, error: "삭제할 수 없는 게시판입니다." };
  await deletePost(uid);
  return { ok: true };
}

// Called after the caller has saved attachment files to disk under the
// post's own uid-named folder (see apps/storefront/lib/board-upload.ts) —
// the post row is created without files first so the upload folder path can
// include the post's real uid, then this attaches the resulting filenames.
export async function setPostFiles(uid: number, filenames: string[]): Promise<void> {
  await prisma.boardPost.update({ where: { uid }, data: { files: filenames.join("|") } });
}

export type PostListItem = {
  uid: number;
  notice: boolean;
  category: number;
  authorName: string;
  subject: string;
  secret: boolean;
  locked: boolean;
  hasFiles: boolean;
  commentCount: number;
  viewCount: number;
  signdate: number;
};

export type PostListResult = {
  items: PostListItem[];
  total: number;
  page: number;
  totalPages: number;
};

const LIST_LIMIT = 15;

function isPostOwner(
  post: { id: string },
  viewerId: string | null,
): boolean {
  return Boolean(post.id) && post.id === viewerId;
}

// Port of board/list.php's successive result-within-result search: every
// whitespace-delimited term must occur in either subject or content.
export async function getPostList(
  boardId: BoardId,
  options: { page?: number; keyword?: string; category?: number; viewerId?: string | null; authorId?: string } = {},
): Promise<PostListResult> {
  const terms = (options.keyword ?? "").trim().split(/\s+/).filter(Boolean);
  const where = {
    board: boardId,
    ...(options.category !== undefined ? { category: options.category } : {}),
    ...(options.authorId ? { id: options.authorId } : {}),
    ...(terms.length
      ? { AND: terms.map((term) => ({ OR: [{ subject: { contains: term } }, { content: { contains: term } }] })) }
      : {}),
  };

  const total = await prisma.boardPost.count({ where });
  const { safePage, totalPages } = clampPage(options.page ?? 1, total, LIST_LIMIT);

  const rows = await prisma.boardPost.findMany({
    where,
    orderBy: [{ notice: "desc" }, { uid: "desc" }],
    skip: (safePage - 1) * LIST_LIMIT,
    take: LIST_LIMIT,
  });

  const viewerId = options.viewerId ?? null;
  return {
    items: rows.map((row) => {
      const secret = row.secret === 1;
      return {
        uid: row.uid,
        notice: row.notice === 1,
        category: row.category,
        authorName: row.name,
        subject: row.subject,
        secret,
        locked: secret && !isPostOwner(row, viewerId),
        hasFiles: row.files.length > 0,
        commentCount: row.comment_count,
        viewCount: row.view_count,
        signdate: row.signdate,
      };
    }),
    total,
    page: safePage,
    totalPages,
  };
}

export type PostViewer = { memberId: string } | { guestPasswordPlain: string } | null;

export type PostDetail = {
  uid: number;
  board: BoardId;
  notice: boolean;
  category: number;
  authorId: string;
  authorName: string;
  subject: string;
  content: string;
  contact: string;
  secret: boolean;
  viewable: boolean;
  files: string[];
  viewCount: number;
  commentCount: number;
  signdate: number;
};

export type PostComment = {
  uid: number;
  authorId: string;
  authorName: string;
  content: string;
  signdate: number;
  parentUid: number;
  depth: number;
};

// Port of board/view.php's secret gate (same shape as inquiry.ts's
// toInquiryItem): member-authored secret posts unlock for the owning
// member; guest-authored secret posts unlock via the argon2id password
// the caller supplies. View count increments on the initial page fetch,
// matching legacy (no de-dupe by viewer) — pass incrementView:false for a
// guest's password-retry attempt so a wrong guess doesn't inflate it.
// `bypassSecret` is for the backoffice app — an admin reading a counsel
// post to answer it isn't the author and has no guest password, so the
// normal ownership checks below would always fail for them otherwise.
export async function getPostDetail(
  boardId: BoardId,
  uid: number,
  viewer: PostViewer,
  options: { incrementView?: boolean; bypassSecret?: boolean } = {},
): Promise<PostDetail | null> {
  const row = await prisma.boardPost.findFirst({ where: { uid, board: boardId } });
  if (!row) return null;

  const secret = row.secret === 1;
  let viewable = !secret || Boolean(options.bypassSecret);
  if (secret && !options.bypassSecret && viewer) {
    if ("memberId" in viewer) {
      viewable = row.id === viewer.memberId;
    } else if (!row.id) {
      viewable = await verifyPassword(row.passwd, viewer.guestPasswordPlain);
    }
  }

  const incrementView = options.incrementView ?? true;
  if (incrementView) {
    await prisma.boardPost.update({ where: { uid }, data: { view_count: { increment: 1 } } });
  }

  return {
    uid: row.uid,
    board: boardId,
    notice: row.notice === 1,
    category: row.category,
    authorId: row.id,
    authorName: row.name,
    subject: row.subject,
    content: viewable ? row.content : "",
    contact: row.contact,
    secret,
    viewable,
    files: row.files ? row.files.split("|").filter(Boolean) : [],
    viewCount: incrementView ? row.view_count + 1 : row.view_count,
    commentCount: row.comment_count,
    signdate: row.signdate,
  };
}

export async function getPostComments(postUid: number): Promise<PostComment[]> {
  const rows = await prisma.boardComment.findMany({ where: { post_uid: postUid }, orderBy: { uid: "asc" } });
  return rows.map((row) => ({ uid: row.uid, authorId: row.id, authorName: row.name, content: row.content, signdate: row.signdate, parentUid: row.parent_uid, depth: row.depth }));
}

export type CreateCommentResult = { ok: true } | { ok: false; error: string };

// Port of board/board_post.php's comment path — flat, no reply-to-comment
// nesting (see 009_phase6_board.sql). Doubles as the counsel "관리자 답변"
// mechanism (commentAuthor:"admin"), same as legacy reuses its generic
// comment_write/comment_reply branch for board answers regardless of board
// type. `actingAsAdmin` must be true for an admin-only board — a customer
// session (or no session at all) is rejected, matching config.commentAuthor.
export async function createComment(
  boardId: BoardId,
  postUid: number,
  author: PostAuthor,
  content: string,
  opts: { actingAsAdmin?: boolean; parentUid?: number } = {},
): Promise<CreateCommentResult> {
  const config = BOARD_CONFIG[boardId];
  if (!config.comments) return { ok: false, error: "댓글을 작성할 수 없는 게시판입니다." };
  if (config.commentAuthor === "admin" && !opts.actingAsAdmin) {
    return { ok: false, error: "관리자만 답변을 작성할 수 있습니다." };
  }
  if (!content.trim()) return { ok: false, error: "댓글 내용을 입력해 주세요." };

  const post = await prisma.boardPost.findFirst({ where: { uid: postUid, board: boardId } });
  if (!post) return { ok: false, error: "존재하지 않는 게시물입니다." };

  const id = "memberId" in author ? author.memberId : "";
  const name = "memberId" in author ? author.memberName : author.guestName;
  const passwd = "memberId" in author ? "" : await hashPassword(author.guestPasswordPlain);
  const parent = opts.parentUid
    ? await prisma.boardComment.findFirst({ where: { uid: opts.parentUid, post_uid: postUid }, select: { uid: true, depth: true } })
    : null;
  if (opts.parentUid && !parent) return { ok: false, error: "답글을 작성할 댓글이 없습니다." };

  await prisma.$transaction([
    prisma.boardComment.create({ data: { post_uid: postUid, id, name, content, passwd, parent_uid: parent?.uid ?? 0, depth: Math.min((parent?.depth ?? -1) + 1, 10), signdate: now() } }),
    prisma.boardPost.update({ where: { uid: postUid }, data: { comment_count: { increment: 1 } } }),
  ]);
  return { ok: true };
}

// Port of board/board_post.php's comment_delete ownership and counter update.
export async function deleteOwnComment(
  boardId: BoardId,
  postUid: number,
  commentUid: number,
  auth: PostOwnerAuth,
): Promise<CreateCommentResult> {
  const [post, comment] = await Promise.all([
    prisma.boardPost.findFirst({ where: { uid: postUid, board: boardId }, select: { uid: true } }),
    prisma.boardComment.findFirst({ where: { uid: commentUid, post_uid: postUid } }),
  ]);
  if (!post || !comment) return { ok: false, error: "등록된 댓글이 없거나 삭제되었습니다." };
  if ("memberId" in auth) {
    if (!comment.id || comment.id !== auth.memberId) return { ok: false, error: "작성자만 삭제할 수 있습니다." };
  } else if (comment.id || !(await verifyPassword(comment.passwd, auth.guestPasswordPlain))) {
    return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  }
  await prisma.$transaction([
    prisma.boardComment.delete({ where: { uid: commentUid } }),
    prisma.boardPost.update({ where: { uid: postUid }, data: { comment_count: { decrement: 1 } } }),
  ]);
  return { ok: true };
}
