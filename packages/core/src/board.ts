import { prisma } from "@shoppingmall/db";
import { hashPassword, verifyPassword } from "@shoppingmall/auth";

export type BoardId = "notice" | "faq" | "counsel" | "gallery";

export type BoardConfigEntry = {
  name: string;
  writable: boolean;
  secretType: "none" | "optional" | "always";
  categories: readonly string[] | null;
  comments: boolean;
  hasFiles: boolean;
  hasContact: boolean;
};

// Port of board/board.php's per-board access config (mallRN_board_manager),
// hardcoded since there's no admin UI to manage it yet — same principle as
// popup.ts / mailer.ts's hardcoded templates. Only the 4 customer-facing
// boards that don't need a vendor login are in scope (vnotice/vcounsel need
// Phase 8's vendor session).
export const BOARD_CONFIG: Record<BoardId, BoardConfigEntry> = {
  notice: { name: "공지사항", writable: false, secretType: "optional", categories: null, comments: false, hasFiles: false, hasContact: false },
  faq: {
    name: "자주 찾는 질문",
    writable: false,
    secretType: "none",
    categories: ["주문/결제", "배송", "교환/반품/환불", "회원", "상품", "기타"],
    comments: false,
    hasFiles: false,
    hasContact: false,
  },
  counsel: {
    name: "1:1 문의",
    writable: true,
    secretType: "always",
    categories: ["배송문의", "입금/계산서문의", "회원정보문의", "교환문의", "반품/취소문의"],
    comments: false,
    hasFiles: false,
    hasContact: true,
  },
  gallery: { name: "갤러리", writable: true, secretType: "none", categories: null, comments: true, hasFiles: true, hasContact: false },
};

export function isBoardId(value: string): value is BoardId {
  return value in BOARD_CONFIG;
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

// Port of board/board_post.php's write path.
export async function createPost(boardId: BoardId, author: PostAuthor, input: CreatePostInput): Promise<CreatePostResult> {
  const config = BOARD_CONFIG[boardId];
  if (!config.writable) return { ok: false, error: "글쓰기가 허용되지 않는 게시판입니다." };
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
  return { ok: true, uid: post.uid };
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

// Port of board/list.php. Search is a single-keyword OR over subject/content
// (this repo's established simplification vs. legacy's multi-keyword AND
// narrowing — see listing.ts's keywordWhere).
export async function getPostList(
  boardId: BoardId,
  options: { page?: number; keyword?: string; category?: number; viewerId?: string | null } = {},
): Promise<PostListResult> {
  const where = {
    board: boardId,
    ...(options.category !== undefined ? { category: options.category } : {}),
    ...(options.keyword
      ? { OR: [{ subject: { contains: options.keyword } }, { content: { contains: options.keyword } }] }
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
  authorName: string;
  content: string;
  signdate: number;
};

// Port of board/view.php's secret gate (same shape as inquiry.ts's
// toInquiryItem): member-authored secret posts unlock for the owning
// member; guest-authored secret posts unlock via the argon2id password
// the caller supplies. View count increments on the initial page fetch,
// matching legacy (no de-dupe by viewer) — pass incrementView:false for a
// guest's password-retry attempt so a wrong guess doesn't inflate it.
export async function getPostDetail(
  boardId: BoardId,
  uid: number,
  viewer: PostViewer,
  options: { incrementView?: boolean } = {},
): Promise<PostDetail | null> {
  const row = await prisma.boardPost.findFirst({ where: { uid, board: boardId } });
  if (!row) return null;

  const secret = row.secret === 1;
  let viewable = !secret;
  if (secret && viewer) {
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
  return rows.map((row) => ({ uid: row.uid, authorName: row.name, content: row.content, signdate: row.signdate }));
}

export type CreateCommentResult = { ok: true } | { ok: false; error: string };

// Port of board/board_post.php's comment path, restricted to gallery in the
// UI (the only in-scope board where legacy actually exposes customer
// comments) — flat, no reply-to-comment nesting (see 009_phase6_board.sql).
export async function createComment(
  boardId: BoardId,
  postUid: number,
  author: PostAuthor,
  content: string,
): Promise<CreateCommentResult> {
  const config = BOARD_CONFIG[boardId];
  if (!config.comments) return { ok: false, error: "댓글을 작성할 수 없는 게시판입니다." };
  if (!content.trim()) return { ok: false, error: "댓글 내용을 입력해 주세요." };

  const post = await prisma.boardPost.findFirst({ where: { uid: postUid, board: boardId } });
  if (!post) return { ok: false, error: "존재하지 않는 게시물입니다." };

  const id = "memberId" in author ? author.memberId : "";
  const name = "memberId" in author ? author.memberName : author.guestName;
  const passwd = "memberId" in author ? "" : await hashPassword(author.guestPasswordPlain);

  await prisma.$transaction([
    prisma.boardComment.create({ data: { post_uid: postUid, id, name, content, passwd, signdate: now() } }),
    prisma.boardPost.update({ where: { uid: postUid }, data: { comment_count: { increment: 1 } } }),
  ]);
  return { ok: true };
}
