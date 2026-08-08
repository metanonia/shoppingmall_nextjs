import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Product/banner/popup/exhibition/add_page images are served by the
// STOREFRONT app (customers browse there, not the backoffice) — both apps
// run from one monorepo checkout on the same host in this repo's current
// setup, so uploads write directly into apps/storefront/public/image/...
// rather than this app's own public/ (which nothing reads). A real
// multi-host deployment would need to swap this for a shared object store;
// see lib/image-url.ts for the matching read-side (admin preview) half of
// this split.
const STOREFRONT_PUBLIC = path.join(process.cwd(), "..", "storefront", "public");

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export type SaveImageResult = { ok: true; filename: string } | { ok: false; error: string };

// `folder` is the /image/{folder} segment (e.g. "goods", "banner", "popup").
// `subfolder`, when given, adds the per-uid segment banner/popup/add_page
// use on the read side (goods/exhibition stay flat — see their own
// comments in goods-admin.ts / exhibition-admin.ts for why).
export async function saveImage(folder: string, file: File, subfolder?: string | number): Promise<SaveImageResult> {
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) return { ok: false, error: `허용되지 않는 이미지 형식입니다: ${file.name}` };
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: "이미지는 5MB 이하만 업로드 가능합니다." };

  const dir =
    subfolder !== undefined ? path.join(STOREFRONT_PUBLIC, "image", folder, String(subfolder)) : path.join(STOREFRONT_PUBLIC, "image", folder);
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return { ok: true, filename };
}
