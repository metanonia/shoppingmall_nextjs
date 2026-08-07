import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BoardId } from "@shoppingmall/core";

// Port of board/board_post.php's attachment handling — legacy stores files
// under board/data/{b_id}/{uid}/ on disk with the filename as-uploaded; this
// repo stores under public/uploads/board/ instead (Next.js serves public/
// statically, no route handler needed) and renames to a random UUID to
// avoid collisions/path traversal from the original filename.
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "pdf"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

export type SaveBoardFilesResult = { ok: true; filenames: string[] } | { ok: false; error: string };

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export async function saveBoardFiles(boardId: BoardId, postUid: number, files: File[]): Promise<SaveBoardFilesResult> {
  if (files.length === 0) return { ok: true, filenames: [] };
  if (files.length > MAX_FILES) return { ok: false, error: `첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.` };

  for (const file of files) {
    const ext = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.has(ext)) return { ok: false, error: `허용되지 않는 파일 형식입니다: ${file.name}` };
    if (file.size > MAX_FILE_SIZE) return { ok: false, error: `파일당 최대 5MB까지 첨부 가능합니다: ${file.name}` };
  }

  const dir = path.join(process.cwd(), "public", "uploads", "board", boardId, String(postUid));
  await mkdir(dir, { recursive: true });

  const filenames: string[] = [];
  for (const file of files) {
    const filename = `${crypto.randomUUID()}.${extensionOf(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    filenames.push(filename);
  }
  return { ok: true, filenames };
}
