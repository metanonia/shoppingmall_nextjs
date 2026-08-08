"use client";

import { useActionState } from "react";
import type { AdminCategoryNode } from "@shoppingmall/core";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction, type ActionState } from "@/app/(protected)/categories/actions";

function CategoryNodeRow({ node, depth }: { node: AdminCategoryNode; depth: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateCategoryAction, {});

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Two independent server actions (update vs delete) can't share one
          <form> — nesting <form> tags is invalid HTML and breaks hydration
          — so these are sibling forms wrapped in a plain <div> instead. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: depth * 24 }}>
        <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="hidden" name="uid" value={node.uid} />
          <span style={{ color: "#999", fontSize: 12 }}>{"—".repeat(depth)}</span>
          <input type="text" name="cateName" defaultValue={node.name} style={{ width: 160 }} />
          <input type="number" name="sequence" defaultValue={node.sequence} style={{ width: 60 }} />
          <label>
            <input type="checkbox" name="used" defaultChecked={node.used} /> 사용
          </label>
          <button type="submit" disabled={pending}>
            저장
          </button>
        </form>
        <form action={deleteCategoryAction}>
          <input type="hidden" name="uid" value={node.uid} />
          <button type="submit">삭제</button>
        </form>
        {state.error && <span style={{ color: "#e02020", fontSize: 12 }}>{state.error}</span>}
      </div>
      {node.children.map((child) => (
        <CategoryNodeRow key={child.uid} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function CategoryTree({ tree }: { tree: AdminCategoryNode[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createCategoryAction, {});

  function flatten(nodes: AdminCategoryNode[], depth = 0): { node: AdminCategoryNode; depth: number }[] {
    return nodes.flatMap((n) => [{ node: n, depth }, ...flatten(n.children, depth + 1)]);
  }
  const flat = flatten(tree);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        {tree.map((node) => (
          <CategoryNodeRow key={node.uid} node={node} depth={0} />
        ))}
      </div>

      <h3 style={{ fontSize: 16 }}>분류 추가</h3>
      <form action={formAction} style={{ display: "flex", gap: 8 }}>
        <select name="parentCate" defaultValue="">
          <option value="">최상위 분류로 추가</option>
          {flat.map(({ node, depth }) => (
            <option key={node.uid} value={node.cate}>
              {"—".repeat(depth)} {node.name}
            </option>
          ))}
        </select>
        <input type="text" name="newCateName" placeholder="분류명" required />
        <button type="submit" disabled={pending}>
          추가
        </button>
      </form>
      {state.error && <div style={{ color: "#e02020", fontSize: 12, marginTop: 4 }}>{state.error}</div>}
    </div>
  );
}
