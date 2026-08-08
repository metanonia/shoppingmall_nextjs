import { prisma } from "@shoppingmall/db";

export type ReviewItem = {
  uid: number;
  orderGoodsUid: number;
  goodsUid: number;
  goodsName: string;
  optionName: string;
  memberId: string;
  authorName: string;
  content: string;
  stars: number;
  best: boolean;
  signdate: number;
  files: string[];
};

function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]} *`;
  return `${name[0]} * ${name.slice(2)}`;
}

function toReviewItem(row: {
  uid: number;
  og_uid: number;
  g_uid: number;
  g_name: string;
  op_name: string;
  id: string;
  name: string;
  content: string;
  stars: number;
  best: number;
  signdate: number;
  files: string | null;
}): ReviewItem {
  return {
    uid: row.uid,
    orderGoodsUid: row.og_uid,
    goodsUid: row.g_uid,
    goodsName: row.g_name,
    optionName: row.op_name,
    memberId: row.id,
    authorName: maskName(row.name),
    content: row.content,
    stars: row.stars,
    best: row.best === 1,
    signdate: row.signdate,
    files: row.files?.split("|").filter(Boolean) ?? [],
  };
}

export type CreateReviewResult = { ok: true; uid: number } | { ok: false; error: string };

// Port of php/review_post.php. The order line is checked against the
// logged-in member before insertion, closing the legacy guest-spoofing path.
export async function createReview(
  memberId: string,
  memberName: string,
  input: { orderGoodsUid: number; stars: number; content: string },
): Promise<CreateReviewResult> {
  if (!Number.isInteger(input.stars) || input.stars < 1 || input.stars > 5 || !input.content.trim()) {
    return { ok: false, error: "별점과 후기 내용을 입력해 주세요." };
  }

  const line = await prisma.orderGoods.findUnique({ where: { uid: input.orderGoodsUid } });
  if (!line) return { ok: false, error: "주문상품을 찾을 수 없습니다." };
  const order = await prisma.orderInfo.findFirst({ where: { order_num: line.order_num, id: memberId, reals: 1 } });
  if (!order) return { ok: false, error: "본인이 주문한 상품만 후기를 작성할 수 있습니다." };
  if (line.status !== 4 && line.status !== 5) {
    return { ok: false, error: "배송완료 또는 구매확정 상품만 후기를 작성할 수 있습니다." };
  }
  if (await prisma.review.findUnique({ where: { og_uid: input.orderGoodsUid } })) {
    return { ok: false, error: "이미 후기를 작성한 상품입니다." };
  }

  const review = await prisma.review.create({
    data: {
      vendor: line.vendor,
      og_uid: line.uid,
      g_uid: line.g_uid,
      g_name: line.g_name,
      op_name: line.option_name,
      id: memberId,
      name: memberName,
      passwd: "****",
      content: input.content.trim(),
      stars: input.stars,
      signdate: Math.floor(Date.now() / 1000),
    },
  });
  return { ok: true, uid: review.uid };
}

export async function setReviewFiles(uid: number, filenames: string[]): Promise<void> {
  await prisma.review.update({ where: { uid }, data: { files: filenames.join("|") } });
}

export async function getGoodsReviews(goodsUid: number): Promise<ReviewItem[]> {
  const rows = await prisma.review.findMany({ where: { g_uid: goodsUid }, orderBy: { uid: "desc" } });
  return rows.map(toReviewItem);
}

export async function getMyReviews(memberId: string): Promise<ReviewItem[]> {
  const rows = await prisma.review.findMany({ where: { id: memberId }, orderBy: { uid: "desc" } });
  return rows.map(toReviewItem);
}

export async function getReviewList(
  page = 1,
  pageSize = 10,
): Promise<{ items: ReviewItem[]; total: number; page: number; totalPages: number }> {
  const total = await prisma.review.count();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rows = await prisma.review.findMany({
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });
  return { items: rows.map(toReviewItem), total, page: safePage, totalPages };
}

export async function getVendorReviewList(vendorId: string, page = 1, pageSize = 20) {
  const total = await prisma.review.count({ where: { vendor: vendorId } });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rows = await prisma.review.findMany({ where: { vendor: vendorId }, orderBy: { uid: "desc" }, skip: (safePage - 1) * pageSize, take: pageSize });
  return { items: rows.map(toReviewItem), total, page: safePage, totalPages };
}

export async function setReviewBest(uid: number, best: boolean): Promise<void> {
  await prisma.review.update({ where: { uid }, data: { best: best ? 1 : 0 } });
}

export async function deleteReview(uid: number): Promise<void> {
  await prisma.review.delete({ where: { uid } });
}

export async function getReviewedOrderGoodsUids(orderGoodsUids: number[]): Promise<Set<number>> {
  if (orderGoodsUids.length === 0) return new Set();
  const rows = await prisma.review.findMany({ where: { og_uid: { in: orderGoodsUids } }, select: { og_uid: true } });
  return new Set(rows.map((row) => row.og_uid));
}
