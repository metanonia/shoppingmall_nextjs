import { getGoodsRanking, type GoodsRankingType } from "@shoppingmall/core";
import { imageUrl } from "@/lib/image-url";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const TYPE_LABELS: Record<GoodsRankingType, string> = { sales: "판매금액", qty: "판매수량", favorite: "관심상품저장수" };

export default async function GoodsRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; type?: string }>;
}) {
  const { dateFrom: dateFromParam, dateTo: dateToParam, type: typeParam } = await searchParams;
  const dateFrom = dateFromParam || daysAgoStr(30);
  const dateTo = dateToParam || todayStr();
  const type = (typeParam === "qty" || typeParam === "favorite" ? typeParam : "sales") as GoodsRankingType;

  const items = await getGoodsRanking(dateFrom, dateTo, type);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품랭킹</h1>

      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" name="dateFrom" defaultValue={dateFrom} />
        ~
        <input type="date" name="dateTo" defaultValue={dateTo} />
        <select name="type" defaultValue={type}>
          {(Object.keys(TYPE_LABELS) as GoodsRankingType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button type="submit">조회</button>
      </form>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>순위</th>
            <th>이미지</th>
            <th>상품명</th>
            <th>{TYPE_LABELS[type]}</th>
            <th>비율</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.uid}>
              <td>{i + 1}</td>
              <td>
                {item.image1 && <img src={imageUrl("goods", item.image1)} alt="" style={{ width: 40, height: 40, objectFit: "cover" }} />}
              </td>
              <td>{item.name}</td>
              <td>{item.value.toLocaleString("en-US")}</td>
              <td>{item.pct}%</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "#999" }}>
                데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
