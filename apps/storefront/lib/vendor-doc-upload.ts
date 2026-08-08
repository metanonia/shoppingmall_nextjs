import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf"]);
const MAX_SIZE = 5 * 1024 * 1024;
function workspaceRoot(): string { return path.basename(process.cwd()) === "storefront" ? path.resolve(process.cwd(), "../..") : process.cwd(); }
const ROOT = process.env.VENDOR_DOC_UPLOAD_ROOT || path.join(workspaceRoot(), "private-uploads", "vendor");

export async function saveVendorApplicationDocs(vendorId: string, files: File[]): Promise<{ ok: true; filenames: string[] } | { ok: false; error: string }> {
  for (const file of files) {
    if (!file.size) continue;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.has(ext)) return { ok: false, error: `허용되지 않는 파일 형식입니다: ${file.name}` };
    if (file.size > MAX_SIZE) return { ok: false, error: "첨부서류는 파일당 5MB 이하만 가능합니다." };
  }
  const dir = path.join(ROOT, vendorId);
  await mkdir(dir, { recursive: true });
  const filenames: string[] = [];
  for (const file of files) {
    if (!file.size) { filenames.push(""); continue; }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const filename = `${crypto.randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    filenames.push(filename);
  }
  return { ok: true, filenames };
}
