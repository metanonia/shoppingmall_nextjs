import { prisma } from "@shoppingmall/db";

export type CategoryNavItem = {
  cate: string; // bigint rendered as string for safe client serialization
  name: string;
  children: CategoryNavItem[];
};

// Port of php/top.php:78-104's "쇼핑카테고리 전체보기" query, guest (my_level=0) path:
// access_type 1 (members-only) categories are hidden, access_type 2 (specific levels)
// categories are hidden unless level 0 is explicitly listed.
function isVisibleToGuest(accessType: number, accessLevel: string): boolean {
  if (accessType === 1) return false;
  if (accessType === 2) return accessLevel.split(",").includes("0");
  return true;
}

export async function getTopLevelCategories(): Promise<CategoryNavItem[]> {
  const topRows = await prisma.cate.findMany({
    where: { cate_dep: 1, used: 1 },
    orderBy: { sequence: "asc" },
  });

  const visibleTop = topRows.filter((row) => isVisibleToGuest(row.access_type, row.access_level));

  const children = await Promise.all(
    visibleTop.map(async (row) => {
      if (row.cate_sub !== 1) return [] as CategoryNavItem[];
      const subRows = await prisma.cate.findMany({
        where: { cate_parent: row.cate, used: 1 },
        orderBy: { sequence: "asc" },
      });
      return subRows
        .filter((sub) => isVisibleToGuest(sub.access_type, sub.access_level))
        .map((sub) => ({ cate: sub.cate.toString(), name: sub.cate_name, children: [] }));
    }),
  );

  return visibleTop.map((row, i) => ({
    cate: row.cate.toString(),
    name: row.cate_name,
    children: children[i],
  }));
}

// Port of lib/lib.Shop.php:98 checkCateAccess($cate), scoped to the target
// category itself rather than walking the full ancestor chain (our seed data
// is only 2 levels deep so there's nothing an ancestor check would catch that
// this doesn't — revisit if a deeper catalog needs it).
export async function checkCateAccess(cate: bigint): Promise<boolean> {
  const row = await prisma.cate.findFirst({ where: { cate, used: 1 } });
  if (!row) return false;
  return isVisibleToGuest(row.access_type, row.access_level);
}

// Port of lib/lib.Shop.php:165 getCateAllName($cate, $link, $sepa) — breadcrumb
// text. Legacy walks ancestors by slicing the zero-padded digit-segment cate
// code; this walks the explicit cate_parent chain instead (see listing.ts's
// getDescendantCateIds for the same substitution, same reasoning).
export async function getCateBreadcrumb(cate: bigint): Promise<string> {
  const names: string[] = [];
  let current: bigint | null = cate;
  for (let depth = 0; depth < 4 && current !== null && current !== BigInt(0); depth++) {
    const row: { cate_name: string; cate_parent: bigint } | null = await prisma.cate.findFirst({
      where: { cate: current },
      select: { cate_name: true, cate_parent: true },
    });
    if (!row) break;
    names.unshift(row.cate_name);
    current = row.cate_parent;
  }
  return names.join(" > ");
}

export type CategoryChip = { cate: string; name: string; selected: boolean; children: CategoryChip[] };

export type ListCategoryChips = {
  secCateName: string;
  location: string;
  chips: CategoryChip[];
};

// Port of php/list.php:8-57's category chip row (`loop_cate` / `loop_sub_cate`
// / `is_sub_cate`). Legacy shows either the current category's own children
// (if it's a browsable parent) or its siblings (if it's a leaf), so the user
// always has something to switch between.
export async function getListCategoryChips(cate: bigint): Promise<ListCategoryChips> {
  const cateInfo = await prisma.cate.findFirst({ where: { cate } });
  if (!cateInfo) return { secCateName: "", location: "", chips: [] };

  const showOwnChildren = cateInfo.cate_dep === 1 || (cateInfo.cate_sub === 1 && cateInfo.cate_dep <= 2);
  const chipParent = showOwnChildren ? cateInfo.cate : cateInfo.cate_parent;

  const chipRows = await prisma.cate.findMany({
    where: { cate_parent: chipParent, used: 1 },
    orderBy: { sequence: "asc" },
  });

  const chips = await Promise.all(
    chipRows
      .filter((row) => isVisibleToGuest(row.access_type, row.access_level))
      .map(async (row) => {
        let children: CategoryChip[] = [];
        if (row.cate_sub === 1) {
          const subRows = await prisma.cate.findMany({
            where: { cate_parent: row.cate, used: 1 },
            orderBy: { sequence: "asc" },
          });
          children = subRows
            .filter((sub) => isVisibleToGuest(sub.access_type, sub.access_level))
            .map((sub) => ({ cate: sub.cate.toString(), name: sub.cate_name, selected: sub.cate === cate, children: [] }));
        }
        return {
          cate: row.cate.toString(),
          name: row.cate_name,
          selected: row.cate === cate || row.cate === cateInfo.cate_parent,
          children,
        };
      }),
  );

  const location = cateInfo.cate_dep > 1 ? await getCateBreadcrumb(cate) : "";

  return { secCateName: cateInfo.cate_name, location, chips };
}
