import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ICON_ROOT = path.join(process.cwd(), "..", "storefront", "public", "image", "icon");
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function extensionOf(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function safeIconName(filename: string) {
  return path.basename(filename) === filename && /^icons_[0-9]{3,}\.(?:jpe?g|png|gif|webp)$/i.test(filename);
}

async function nextIconName(ext: string) {
  await mkdir(ICON_ROOT, { recursive: true });
  const files = await readdir(ICON_ROOT);
  const max = files.reduce((current, name) => {
    const match = /^icons_([0-9]+)\./i.exec(name);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `icons_${String(max + 1).padStart(3, "0")}.${ext}`;
}

export async function saveGoodsIcon(file: File, replaceName?: string): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) return { ok: false, error: "JPG, PNG, GIF, WEBP 이미지만 업로드할 수 있습니다." };
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return { ok: false, error: "아이콘은 파일당 5MB 이하만 업로드할 수 있습니다." };
  await mkdir(ICON_ROOT, { recursive: true });
  const filename = replaceName && safeIconName(replaceName) ? `${replaceName.slice(0, replaceName.lastIndexOf("."))}.${ext}` : await nextIconName(ext);
  await writeFile(path.join(ICON_ROOT, filename), Buffer.from(await file.arrayBuffer()));
  if (replaceName && replaceName !== filename && safeIconName(replaceName)) await unlink(path.join(ICON_ROOT, replaceName)).catch(() => undefined);
  return { ok: true, filename };
}

export async function removeGoodsIcon(filename: string): Promise<boolean> {
  if (!safeIconName(filename)) return false;
  await unlink(path.join(ICON_ROOT, filename)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  return true;
}
