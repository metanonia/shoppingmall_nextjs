import { prisma } from "@shoppingmall/db";

export type AddPageView = {
  uid: number;
  title: string;
  imageOnly: boolean;
  imageUrls: string[];
  imageGap: boolean;
  explainsHtml: string | null;
};

// Port of php/add_page.php. Admin CRUD added in Phase 7 (see below).
// `status===1` means hidden (legacy's `alert(...,"back")` guard), not deleted.
export async function getAddPage(uid: number): Promise<AddPageView | null> {
  const row = await prisma.addPage.findFirst({ where: { uid } });
  if (!row || row.status === 1) return null;

  const imageOnly = row.detail_image_only === 1;
  const imageUrls = imageOnly
    ? row.detail_image
        .split(",")
        .filter(Boolean)
        .map((name) => `/image/add_page/${row.uid}/${name}`)
    : [];

  return {
    uid: row.uid,
    title: row.title,
    imageOnly,
    imageUrls,
    imageGap: row.detail_image_type === 1,
    explainsHtml: imageOnly ? null : row.explains,
  };
}

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type AddPageFormInput = {
  title: string;
  detailImageOnly: boolean;
  detailImageType: 1 | 2;
  explains: string;
  status: number;
};

export type AddPageAdminResult = { ok: true; uid: number } | { ok: false; error: string };

// Admin CRUD (Phase 7) — images use a per-uid subfolder like legacy's
// board/{uid}/ (detailImageToTag2's own convention), so the row is created
// first without `detail_image` and the caller attaches filenames afterward
// via setAddPageImages, once the real uid exists to build the upload path.
export async function createAddPage(input: AddPageFormInput): Promise<AddPageAdminResult> {
  if (!input.title.trim()) return { ok: false, error: "제목을 입력해 주세요." };
  const created = await prisma.addPage.create({
    data: {
      title: input.title,
      detail_image_only: input.detailImageOnly ? 1 : 0,
      detail_image_type: input.detailImageType,
      explains: input.explains,
      status: input.status,
      signdate: now(),
    },
  });
  return { ok: true, uid: created.uid };
}

export async function updateAddPage(uid: number, input: AddPageFormInput): Promise<AddPageAdminResult> {
  if (!input.title.trim()) return { ok: false, error: "제목을 입력해 주세요." };
  const updated = await prisma.addPage.updateMany({
    where: { uid },
    data: {
      title: input.title,
      detail_image_only: input.detailImageOnly ? 1 : 0,
      detail_image_type: input.detailImageType,
      explains: input.explains,
    },
  });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 페이지입니다." };
  return { ok: true, uid };
}

export async function setAddPageImages(uid: number, filenames: string[]): Promise<void> {
  await prisma.addPage.update({ where: { uid }, data: { detail_image: filenames.join(",") } });
}

export async function deleteAddPage(uid: number): Promise<void> {
  await prisma.addPage.deleteMany({ where: { uid } });
}

export type AdminAddPageListItem = { uid: number; title: string; status: number };

export async function getAdminAddPageList(): Promise<AdminAddPageListItem[]> {
  const rows = await prisma.addPage.findMany({ orderBy: { uid: "desc" } });
  return rows.map((r) => ({ uid: r.uid, title: r.title, status: r.status }));
}

export type AdminAddPageDetail = AddPageFormInput & { uid: number; detailImages: string[] };

export async function getAdminAddPageDetail(uid: number): Promise<AdminAddPageDetail | null> {
  const row = await prisma.addPage.findFirst({ where: { uid } });
  if (!row) return null;
  return {
    uid: row.uid,
    title: row.title,
    detailImageOnly: row.detail_image_only === 1,
    detailImageType: row.detail_image_type === 2 ? 2 : 1,
    explains: row.explains,
    status: row.status,
    detailImages: row.detail_image.split(",").filter(Boolean),
  };
}
