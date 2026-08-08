import { getAdminBannerList } from "@shoppingmall/core";
import { deleteBannerAction } from "@/app/(protected)/banners/actions";

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ device?: string }> }) {
  const { device: deviceParam } = await searchParams;
  const device = deviceParam === "mobile" ? "mobile" : "pc";
  const banners = await getAdminBannerList(device);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>배너 관리</h1>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <div>
          <a href="/banners?device=pc" style={{ marginRight: 12, fontWeight: device === "pc" ? "bold" : "normal" }}>
            PC
          </a>
          <a href="/banners?device=mobile" style={{ fontWeight: device === "mobile" ? "bold" : "normal" }}>
            모바일
          </a>
        </div>
        <a href={`/banners/new?device=${device}`}>
          <button type="button">배너 등록</button>
        </a>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>배너명</th>
            <th>코드</th>
            <th>순서</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.uid}>
              <td>
                <a href={`/banners/${b.uid}/edit?device=${device}`}>{b.name}</a>
              </td>
              <td>{b.code}</td>
              <td>{b.sequence}</td>
              <td>{b.status === 0 ? "사용" : "미사용"}</td>
              <td>
                <form action={deleteBannerAction}>
                  <input type="hidden" name="uid" value={b.uid} />
                  <input type="hidden" name="device" value={device} />
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
