import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Business-registration cert / bankbook copy (vendor_info.php's image1/2).
// Legacy served these from a public path — real PII (bank account +
// business registration number), so this repo deliberately does NOT reuse
// image-upload.ts's storefront-public destination. Files live under this
// app's own untracked private-uploads/ dir and are only ever served through
// app/vendor-docs/[...path]/route.ts, which re-checks the requester's own
// session before streaming bytes.
const PRIVATE_UPLOAD_ROOT = path.join(process.cwd(), "private-uploads", "vendor");

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export type SaveVendorDocResult = { ok: true; filename: string } | { ok: false; error: string };

export async function saveVendorDoc(vendorId: string, file: File): Promise<SaveVendorDocResult> {
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) return { ok: false, error: `허용되지 않는 파일 형식입니다: ${file.name}` };
  if (file.size > MAX_FILE_SIZE) return { ok: false, error: "파일은 5MB 이하만 업로드 가능합니다." };

  const dir = path.join(PRIVATE_UPLOAD_ROOT, vendorId);
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return { ok: true, filename };
}

export function vendorDocPath(vendorId: string, filename: string): string {
  return path.join(PRIVATE_UPLOAD_ROOT, vendorId, filename);
}
