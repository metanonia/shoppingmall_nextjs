import { prisma } from "@shoppingmall/db";

export type InquiryItem = {
  uid: number;
  goodsUid: number;
  goodsName: string;
  subject: string;
  content: string;
  answer: string | null;
  answered: boolean;
  secret: boolean;
  authorId: string;
  authorName: string;
  signdate: number;
  viewable: boolean;
};

// Port of php/inquiry_post.php, member-only: legacy also allows a
// guest-with-password path (mallRN_inquiry.passwd), which needs its own
// password-check popup flow (php/popup_passwd.php / passwd_check_json.php).
// Skipped for now — every member is already authenticated via Phase 3's
// session, so this only wires the simpler, already-available path. See
// MIGRATION.md.
export type CreateInquiryInput = {
  goodsUid: number;
  subject: string;
  content: string;
  contact?: string;
  secret?: boolean;
};

export type CreateInquiryResult = { ok: true } | { ok: false; error: string };

export async function createInquiry(
  memberId: string,
  memberName: string,
  input: CreateInquiryInput,
): Promise<CreateInquiryResult> {
  if (!input.subject.trim() || !input.content.trim()) {
    return { ok: false, error: "제목과 내용을 입력해 주세요." };
  }

  const goods = await prisma.goods.findFirst({ where: { uid: input.goodsUid }, select: { name: true, vendor: true } });
  if (!goods) return { ok: false, error: "존재하지 않는 상품입니다." };

  await prisma.inquiry.create({
    data: {
      vendor: goods.vendor,
      g_uid: input.goodsUid,
      g_name: goods.name,
      id: memberId,
      name: memberName,
      subject: input.subject,
      contact: input.contact ?? "",
      content: input.content,
      secret: input.secret ? 1 : 0,
      signdate: Math.floor(Date.now() / 1000),
    },
  });
  return { ok: true };
}

function toInquiryItem(
  row: {
    uid: number;
    g_uid: number;
    g_name: string;
    subject: string;
    content: string;
    answer: string;
    secret: number;
    id: string;
    name: string;
    signdate: number;
  },
  viewerId: string | null,
): InquiryItem {
  // Port of php/view_inquiry.php's subject_function secret gate, simplified
  // to member-only authorship: no admin bypass yet (no admin backend exists
  // to answer inquiries either), so "viewable" is just "is the author".
  const secret = row.secret === 1;
  const viewable = !secret || row.id === viewerId;
  return {
    uid: row.uid,
    goodsUid: row.g_uid,
    goodsName: row.g_name,
    subject: row.subject,
    content: viewable ? row.content : "",
    answer: row.answer ? row.answer : null,
    answered: Boolean(row.answer),
    secret,
    authorId: row.id,
    authorName: row.name,
    signdate: row.signdate,
    viewable,
  };
}

// Port of php/view_inquiry.php's inline product-page inquiry list.
export async function getGoodsInquiries(goodsUid: number, viewerId: string | null): Promise<InquiryItem[]> {
  const rows = await prisma.inquiry.findMany({ where: { g_uid: goodsUid }, orderBy: { uid: "desc" } });
  return rows.map((row) => toInquiryItem(row, viewerId));
}

// Port of php/my_inquiry.php.
export async function getMyInquiries(memberId: string): Promise<InquiryItem[]> {
  const rows = await prisma.inquiry.findMany({ where: { id: memberId }, orderBy: { uid: "desc" } });
  return rows.map((row) => toInquiryItem(row, memberId));
}
