import dns from "node:dns/promises";
import net from "node:net";

// Excel bulk-import (goods-excel-import.ts) is the only caller that fetches
// attacker-influenced URLs (spreadsheet cells) server-side — every other
// upload path in this app takes a File the browser already fetched. That
// makes this the one place in the repo that needs SSRF hardening: without
// it, an uploaded sheet could point "이미지경로" at http://169.254.169.254/...
// or an internal admin endpoint and have this server fetch it on the
// attacker's behalf.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a === 192 && b === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true; // multicast + reserved (224.0.0.0/4, 240.0.0.0/4)
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // fe80::/10
    if (lower.startsWith("::ffff:")) return isPrivateOrReservedIp(lower.slice("::ffff:".length));
    return false;
  }
  return true; // unrecognized shape — reject rather than guess
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (hostname === "localhost") throw new Error("내부 호스트로의 요청은 허용되지 않습니다.");
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) throw new Error("내부 IP 대역으로의 요청은 허용되지 않습니다.");
    return;
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) throw new Error("호스트를 확인할 수 없습니다.");
  for (const { address } of addresses) {
    if (isPrivateOrReservedIp(address)) throw new Error("내부 IP 대역으로의 요청은 허용되지 않습니다.");
  }
}

export type FetchImageResult = { ok: true; buffer: Buffer; ext: string } | { ok: false; error: string };

// Resolves the DNS name itself (blocking DNS-rebinding to an internal IP
// after the check) and re-validates on every redirect hop (an attacker could
// otherwise point at a public URL that 302s to an internal address).
export async function fetchImageSafely(rawUrl: string): Promise<FetchImageResult> {
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let url: URL;
    try {
      url = new URL(currentUrl);
    } catch {
      return { ok: false, error: "이미지 URL 형식이 올바르지 않습니다." };
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: "http/https 이미지 URL만 허용됩니다." };
    }

    try {
      await assertPublicHost(url.hostname);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "허용되지 않는 이미지 호스트입니다." };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, { redirect: "manual", signal: controller.signal });
    } catch {
      return { ok: false, error: "이미지를 가져오지 못했습니다." };
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { ok: false, error: "이미지 URL 리다이렉트 응답이 올바르지 않습니다." };
      currentUrl = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) return { ok: false, error: `이미지를 가져오지 못했습니다 (HTTP ${response.status}).` };

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const ext = CONTENT_TYPE_EXT[contentType];
    if (!ext) return { ok: false, error: `지원하지 않는 이미지 형식입니다: ${contentType || "알 수 없음"}` };

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_IMAGE_BYTES) return { ok: false, error: "이미지 용량이 너무 큽니다(최대 8MB)." };

    const body = response.body;
    if (!body) return { ok: false, error: "이미지 응답 본문이 없습니다." };

    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.length;
      if (total > MAX_IMAGE_BYTES) return { ok: false, error: "이미지 용량이 너무 큽니다(최대 8MB)." };
      chunks.push(chunk);
    }

    return { ok: true, buffer: Buffer.concat(chunks), ext };
  }

  return { ok: false, error: "리다이렉트가 너무 많습니다." };
}
