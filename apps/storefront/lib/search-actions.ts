"use server";

import { deleteAllRecentKeywords, getAutocompleteSuggestions, getPopularKeywords, getRecentKeywords } from "@shoppingmall/core";
import { getSession } from "./auth";
import { getClientIp } from "./request";

async function getViewer() {
  const [session, ip] = await Promise.all([getSession(), getClientIp()]);
  return { memberId: session?.userId, ip };
}

// Backs the top-nav search dropdown's default state (focus, empty input) —
// port of php/top.php's recent + popular keyword lists.
export async function getSearchDropdownData(): Promise<{ recent: string[]; popular: string[] }> {
  const viewer = await getViewer();
  const [recent, popular] = await Promise.all([getRecentKeywords(viewer), getPopularKeywords()]);
  return { recent, popular };
}

// Backs the live-typing suggestions — see search-keyword.ts for why this is
// powered by the search log directly instead of mallRN_keyword_autocomplete.
export async function getAutocomplete(prefix: string): Promise<string[]> {
  return getAutocompleteSuggestions(prefix);
}

export async function clearRecentKeywords(): Promise<void> {
  const viewer = await getViewer();
  await deleteAllRecentKeywords(viewer);
}
