import { type Prisma, prisma } from "@shoppingmall/db";

type DbClient = typeof prisma | Prisma.TransactionClient;

// Admin category CRUD. Legacy (managers/goods/cate_post.php) encodes tree
// position directly into the `cate` value itself (4 levels x 3 zero-padded
// digits, e.g. 101001000000) and bulk-updates descendants via
// `SUBSTRING(cate,1,N)` matching. This repo's read side (categories.ts)
// already abandoned that scheme in favor of walking the explicit
// cate_parent chain, so the write side follows suit: `cate` becomes a
// position-less unique id (existing max + 1), and all tree structure lives
// in cate_parent/cate_dep/sequence. Descendant bulk-updates use a recursive
// cate_parent lookup instead of a SUBSTRING match.

async function nextCateId(db: DbClient = prisma): Promise<bigint> {
  const max = await db.cate.aggregate({ _max: { cate: true } });
  return (max._max.cate ?? BigInt(0)) + BigInt(1);
}

export type CategoryInput = {
  cateName: string;
  parentCate: bigint | null;
  accessType: number;
  accessLevel: string;
};

export type CategoryResult = { ok: true; cate: bigint } | { ok: false; error: string };

export async function createCategory(input: CategoryInput): Promise<CategoryResult> {
  if (!input.cateName.trim()) return { ok: false, error: "분류명을 입력해 주세요." };

  const parent = input.parentCate ? await prisma.cate.findFirst({ where: { cate: input.parentCate } }) : null;
  if (input.parentCate && !parent) return { ok: false, error: "존재하지 않는 상위 분류입니다." };

  const cateDep = parent ? parent.cate_dep + 1 : 1;
  if (cateDep > 4) return { ok: false, error: "분류는 최대 4단계까지 만들 수 있습니다." };

  const siblingMaxSeq = await prisma.cate.aggregate({
    _max: { sequence: true },
    where: { cate_parent: input.parentCate ?? BigInt(0) },
  });

  const cate = await prisma.$transaction(async (tx) => {
    const newCate = await nextCateId(tx);
    await tx.cate.create({
      data: {
        cate: newCate,
        cate_name: input.cateName,
        cate_dep: cateDep,
        cate_parent: input.parentCate ?? BigInt(0),
        cate_sub: 0,
        used: 1,
        sequence: (siblingMaxSeq._max.sequence ?? 0) + 1,
        access_type: input.accessType,
        access_level: input.accessLevel,
      },
    });
    if (parent && parent.cate_sub !== 1) {
      await tx.cate.update({ where: { uid: parent.uid }, data: { cate_sub: 1 } });
    }
    return newCate;
  });

  return { ok: true, cate };
}

export type UpdateCategoryInput = { cateName: string; used: boolean; accessType: number; accessLevel: string; sequence: number };

export async function updateCategory(uid: number, input: UpdateCategoryInput): Promise<CategoryResult> {
  if (!input.cateName.trim()) return { ok: false, error: "분류명을 입력해 주세요." };
  const row = await prisma.cate.findFirst({ where: { uid } });
  if (!row) return { ok: false, error: "존재하지 않는 분류입니다." };

  await prisma.cate.update({
    where: { uid },
    data: {
      cate_name: input.cateName,
      used: input.used ? 1 : 0,
      access_type: input.accessType,
      access_level: input.accessLevel,
      sequence: input.sequence,
    },
  });
  return { ok: true, cate: row.cate };
}

export type DeleteCategoryResult = { ok: true } | { ok: false; error: string };

export async function deleteCategory(uid: number): Promise<DeleteCategoryResult> {
  const row = await prisma.cate.findFirst({ where: { uid } });
  if (!row) return { ok: false, error: "존재하지 않는 분류입니다." };

  const childCount = await prisma.cate.count({ where: { cate_parent: row.cate } });
  if (childCount > 0) return { ok: false, error: "하위 분류가 있는 분류는 삭제할 수 없습니다." };

  const taggedCount = await prisma.goodsCate.count({ where: { cate: row.cate } });
  if (taggedCount > 0) return { ok: false, error: "상품이 등록된 분류는 삭제할 수 없습니다." };

  await prisma.$transaction(async (tx) => {
    await tx.cate.delete({ where: { uid } });
    const remainingSiblings = await tx.cate.count({ where: { cate_parent: row.cate_parent } });
    if (remainingSiblings === 0 && row.cate_parent !== BigInt(0)) {
      await tx.cate.updateMany({ where: { cate: row.cate_parent }, data: { cate_sub: 0 } });
    }
  });
  return { ok: true };
}

export type AdminCategoryNode = {
  uid: number;
  cate: string;
  name: string;
  used: boolean;
  sequence: number;
  accessType: number;
  accessLevel: string;
  children: AdminCategoryNode[];
};

// Full tree for the admin category management screen (unlike
// categories.ts's guest-visibility-filtered getTopLevelCategories, this
// shows every category regardless of used/access settings).
export async function getAdminCategoryTree(): Promise<AdminCategoryNode[]> {
  const all = await prisma.cate.findMany({ orderBy: { sequence: "asc" } });
  const byParent = new Map<string, typeof all>();
  for (const row of all) {
    const key = row.cate_parent.toString();
    const arr = byParent.get(key) ?? [];
    arr.push(row);
    byParent.set(key, arr);
  }

  function build(parentCate: bigint): AdminCategoryNode[] {
    const children = byParent.get(parentCate.toString()) ?? [];
    return children.map((row) => ({
      uid: row.uid,
      cate: row.cate.toString(),
      name: row.cate_name,
      used: row.used === 1,
      sequence: row.sequence,
      accessType: row.access_type,
      accessLevel: row.access_level,
      children: build(row.cate),
    }));
  }

  return build(BigInt(0));
}
