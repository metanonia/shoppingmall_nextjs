import { prisma } from "@shoppingmall/db";

export type AddPageView = {
  uid: number;
  title: string;
  imageOnly: boolean;
  imageUrls: string[];
  imageGap: boolean;
  explainsHtml: string | null;
};

// Port of php/add_page.php. No admin CRUD exists (Phase 7) — content is
// seed-data only, same principle as popup.ts. `status===1` means hidden
// (legacy's `alert(...,"back")` guard), not deleted.
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
