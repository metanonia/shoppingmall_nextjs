import { getAdminPopupList } from "@shoppingmall/core";
import { deletePopupAction } from "@/app/(protected)/popups/actions";

export default async function PopupsPage({ searchParams }: { searchParams: Promise<{ device?: string }> }) {
  const { device: deviceParam } = await searchParams;
  const device = deviceParam === "mobile" ? "mobile" : "pc";
  const popups = await getAdminPopupList(device);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>팝업 관리</h1>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <div>
          <a href="/popups?device=pc" style={{ marginRight: 12, fontWeight: device === "pc" ? "bold" : "normal" }}>
            PC
          </a>
          <a href="/popups?device=mobile" style={{ fontWeight: device === "mobile" ? "bold" : "normal" }}>
            모바일
          </a>
        </div>
        <a href={`/popups/new?device=${device}`}>
          <button type="button">팝업 등록</button>
        </a>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>팝업명</th>
            <th>위치</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {popups.map((p) => (
            <tr key={p.uid}>
              <td>
                <a href={`/popups/${p.uid}/edit?device=${device}`}>{p.name}</a>
              </td>
              <td>{p.position === 0 ? "직접입력" : "중앙"}</td>
              <td>{p.status === 0 ? "사용" : "미사용"}</td>
              <td>
                <form action={deletePopupAction}>
                  <input type="hidden" name="uid" value={p.uid} />
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
