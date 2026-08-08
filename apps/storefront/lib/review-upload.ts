import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf"]);

export async function saveReviewFiles(uid: number, files: File[]) {
  if (files.length > 5) return { ok: false as const, error: "첨부파일은 최대 5개까지 가능합니다." };
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) return { ok: false as const, error: `허용되지 않는 파일 형식입니다: ${file.name}` };
    if (file.size > 5 * 1024 * 1024) return { ok: false as const, error: `파일당 최대 5MB까지 첨부 가능합니다: ${file.name}` };
  }
  const directory = path.join(process.cwd(), "public", "uploads", "review", String(uid));
  await mkdir(directory, { recursive: true });
  const filenames: string[] = [];
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const filename = `${crypto.randomUUID()}.${extension}`;
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
    filenames.push(filename);
  }
  return { ok: true as const, filenames };
}
