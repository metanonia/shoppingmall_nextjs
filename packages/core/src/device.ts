// Port of include/config.php's MOBILE_AGENT constant and php/init.php's
// `$is_mobile = preg_match('/'.MOBILE_AGENT.'/i', $_SERVER['HTTP_USER_AGENT'])` check.
// The legacy site picks a whole separate template/CSS/JS tree (the `mobile_` filename
// prefix) based on this single regex test against the request User-Agent header.
export const MOBILE_AGENT_PATTERN =
  /phone|samsung|lgtel|mobile|[^A]skt|nokia|blackberry|BB10|android|sony/i;

export type Device = "pc" | "mobile";

export function detectDevice(userAgent: string | null | undefined): Device {
  if (!userAgent) return "pc";
  return MOBILE_AGENT_PATTERN.test(userAgent) ? "mobile" : "pc";
}
