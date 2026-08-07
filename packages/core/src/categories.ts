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
