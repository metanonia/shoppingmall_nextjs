import { headers } from "next/headers";

// Best-effort client IP for AccessLog — this repo has no reverse-proxy
// setup that guarantees x-forwarded-for, so an empty string (same as
// legacy's REMOTE_ADDR when unavailable) is an acceptable fallback rather
// than something worth failing the request over.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "";
}
