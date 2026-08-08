// Read-side counterpart to image-upload.ts's write target: images live
// under the storefront app's public/ dir, so admin preview thumbnails need
// an absolute URL pointing at storefront's origin rather than a
// same-origin relative path (nothing at that path exists on this app's own
// dev server / port).
const STOREFRONT_BASE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

export function imageUrl(folder: string, filename: string, subfolder?: string | number): string {
  if (!filename) return "";
  const path = subfolder !== undefined ? `/image/${folder}/${subfolder}/${filename}` : `/image/${folder}/${filename}`;
  return `${STOREFRONT_BASE_URL}${path}`;
}
