import { getAdminAddPageList } from "@shoppingmall/core";
import { deleteAddPageAction } from "@/app/(protected)/pages/actions";

export default async function AddPagesPage() {
  const pages = await getAdminAddPageList();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>정적페이지 관리</h1>
      <div style={{ marginBottom: 16 }}>
        <a href="/pages/new">
          <button type="button">페이지 등록</button>
        </a>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>제목</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.uid}>
              <td>
                <a href={`/pages/${p.uid}/edit`}>{p.title}</a>
              </td>
              <td>{p.status === 0 ? "사용" : "미사용"}</td>
              <td>
                <form action={deleteAddPageAction}>
                  <input type="hidden" name="uid" value={p.uid} />
                  <button type="submit">삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
