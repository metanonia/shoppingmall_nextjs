const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) throw new Error("CRON_SECRET is not set");

// Shared by every app/api/cron/*/route.ts — a bearer-token stand-in for
// legacy's referer/IP gate on async_*.php (see MIGRATION.md's cron section).
export function isAuthorizedCronRequest(request: Request): boolean {
  return request.headers.get("authorization") === `Bearer ${CRON_SECRET}`;
}
