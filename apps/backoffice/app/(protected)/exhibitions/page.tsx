import { getAdminExhibitionList } from "@shoppingmall/core";

const STATUS_LABELS: Record<number, string> = { 0: "-", 1: "준비중", 2: "진행중", 3: "종료" };

export default async function ExhibitionsPage() {
  const list = await getAdminExhibitionList();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>기획전 관리</h1>
      <div style={{ marginBottom: 16 }}>
        <a href="/exhibitions/new">
          <button type="button">기획전 등록</button>
        </a>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>기획전명</th>
            <th>상태</th>
            <th>상품수</th>
          </tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.uid}>
              <td>
                <a href={`/exhibitions/${e.uid}/edit`}>{e.name}</a>
              </td>
              <td>{STATUS_LABELS[e.status] ?? "-"}</td>
              <td>{e.goodsCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
