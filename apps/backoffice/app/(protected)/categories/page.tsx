import { getAdminCategoryTree } from "@shoppingmall/core";
import { CategoryTree } from "@/components/CategoryTree";

export default async function CategoriesPage() {
  const tree = await getAdminCategoryTree();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>카테고리 관리</h1>
      <CategoryTree tree={tree} />
    </div>
  );
}
