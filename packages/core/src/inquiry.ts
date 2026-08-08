import { prisma } from "@shoppingmall/db";
import { hashPassword, verifyPassword } from "@shoppingmall/auth";
import { sendPushNotification } from "./push";

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
  guestProtected: boolean;
  files: string[];
};

export type InquiryAuthor =
  | { memberId: string; memberName: string }
  | { guestName: string; guestPasswordPlain: string };

export type CreateInquiryInput = {
  goodsUid: number;
  subject: string;
  content: string;
  contact?: string;
  secret?: boolean;
  category?: number;
};

export type CreateInquiryResult = { ok: true; uid: number } | { ok: false; error: string };
export type InquiryMutationResult = { ok: true } | { ok: false; error: string };

export async function createInquiry(
  author: InquiryAuthor,
  input: CreateInquiryInput,
): Promise<CreateInquiryResult> {
  if (!input.subject.trim() || !input.content.trim()) {
    return { ok: false, error: "제목과 내용을 입력해 주세요." };
  }

  const goods = await prisma.goods.findFirst({ where: { uid: input.goodsUid }, select: { name: true, vendor: true } });
  if (!goods) return { ok: false, error: "존재하지 않는 상품입니다." };

  const config = await prisma.configuration.findUnique({
    where: { uid: 1 },
    select: { inquiry_access_write: true, inquiry_secret_type: true },
  });
  const isMember = "memberId" in author;
  if (!isMember && config?.inquiry_access_write === 1) {
    return { ok: false, error: "회원만 상품문의를 작성할 수 있습니다." };
  }
  if (!isMember && (!author.guestName.trim() || !author.guestPasswordPlain.trim())) {
    return { ok: false, error: "이름과 비밀번호를 입력해 주세요." };
  }
  const secretType = config?.inquiry_secret_type ?? 0;
  const secret = secretType === 1 || (secretType === 2 && Boolean(input.secret));

  const inquiry = await prisma.inquiry.create({
    data: {
      vendor: goods.vendor,
      g_uid: input.goodsUid,
      g_name: goods.name,
      id: isMember ? author.memberId : "",
      name: isMember ? author.memberName : author.guestName.trim(),
      passwd: isMember ? await hashPassword("****") : await hashPassword(author.guestPasswordPlain),
      subject: input.subject,
      contact: input.contact ?? "",
      content: input.content,
      cate: input.category ?? 0,
      secret: secret ? 1 : 0,
      signdate: Math.floor(Date.now() / 1000),
    },
  });
  await sendPushNotification("신규 상품문의 알림!", `${isMember ? author.memberName : author.guestName}님의 상품문의가 접수되었습니다.`, goods.vendor ? [goods.vendor] : []).catch(() => {});
  return { ok: true, uid: inquiry.uid };
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
    files: string | null;
  },
  viewerId: string | null,
): InquiryItem {
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
    guestProtected: secret && !row.id,
    files: row.files?.split("|").filter(Boolean) ?? [],
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

export type UnlockInquiryResult =
  | { ok: true; content: string; answer: string | null; files: string[] }
  | { ok: false; error: string };

// Port of php/passwd_check_json.php's guest-password branch.
export async function unlockGuestInquiry(uid: number, password: string): Promise<UnlockInquiryResult> {
  if (!Number.isInteger(uid) || !password) return { ok: false, error: "비밀번호를 입력해 주세요." };
  const row = await prisma.inquiry.findUnique({
    where: { uid },
    select: { id: true, passwd: true, content: true, answer: true, secret: true, files: true },
  });
  if (!row) return { ok: false, error: "등록된 문의가 없거나 삭제되었습니다." };
  if (row.id || row.secret !== 1) return { ok: false, error: "비밀번호 확인 대상이 아닙니다." };
  if (!(await verifyPassword(row.passwd, password))) return { ok: false, error: "비밀번호가 일치하지 않습니다." };
  return { ok: true, content: row.content, answer: row.answer || null, files: row.files?.split("|").filter(Boolean) ?? [] };
}

export async function setInquiryFiles(uid: number, filenames: string[]): Promise<void> {
  await prisma.inquiry.update({ where: { uid }, data: { files: filenames.join("|") } });
}

export async function getAdminInquiryList(
  page = 1,
  pageSize = 20,
): Promise<{ items: InquiryItem[]; total: number; page: number; totalPages: number }> {
  const total = await prisma.inquiry.count();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rows = await prisma.inquiry.findMany({
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });
  return { items: rows.map((row) => toInquiryItem(row, row.id)), total, page: safePage, totalPages };
}

export async function getVendorInquiryList(
  vendorId: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: InquiryItem[]; total: number; page: number; totalPages: number }> {
  const where = { vendor: vendorId };
  const total = await prisma.inquiry.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rows = await prisma.inquiry.findMany({ where, orderBy: { uid: "desc" }, skip: (safePage - 1) * pageSize, take: pageSize });
  return { items: rows.map((row) => toInquiryItem(row, row.id)), total, page: safePage, totalPages };
}

// Port of managers/etcs/inquiry_post.php's answer mode.
export async function answerInquiry(uid: number, answer: string): Promise<InquiryMutationResult> {
  if (!Number.isInteger(uid) || !answer.trim()) return { ok: false, error: "답변을 입력해 주세요." };
  const result = await prisma.inquiry.updateMany({ where: { uid }, data: { answer: answer.trim() } });
  if (result.count === 0) return { ok: false, error: "해당 상품문의가 존재하지 않습니다." };
  return { ok: true };
}

export async function answerVendorInquiry(vendorId: string, uid: number, answer: string): Promise<InquiryMutationResult> {
  if (!answer.trim()) return { ok: false, error: "답변을 입력해 주세요." };
  const result = await prisma.inquiry.updateMany({ where: { uid, vendor: vendorId }, data: { answer: answer.trim() } });
  return result.count ? { ok: true } : { ok: false, error: "해당 상품문의가 없거나 권한이 없습니다." };
}

export async function deleteInquiry(uid: number): Promise<void> {
  await prisma.inquiry.delete({ where: { uid } });
}
