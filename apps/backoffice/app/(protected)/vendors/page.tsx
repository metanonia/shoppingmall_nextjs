import { getAdminVendorList } from "@shoppingmall/core";
import { updateVendorAuthAction } from "@/app/(protected)/vendors/actions";

const AUTH_LABELS: Record<string, string> = { R: "승인대기", Y: "승인", N: "거절" };

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ keyword?: string }> }) {
  const { keyword } = await searchParams;
  const vendors = await getAdminVendorList({ keyword });

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>입점사 관리</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="아이디/상호명/대표자명" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>아이디</th>
            <th>상호명</th>
            <th>대표자</th>
            <th>연락처</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <tr key={v.uid}>
              <td>{v.id}</td>
              <td>{v.compName}</td>
              <td>{v.compOwner}</td>
              <td>{v.contCell}</td>
              <td>{AUTH_LABELS[v.auth]}</td>
              <td>
                <form action={updateVendorAuthAction} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="vendorUid" value={v.uid} />
                  {v.auth !== "Y" && (
                    <button type="submit" name="auth" value="Y">
                      승인
                    </button>
                  )}
                  {v.auth !== "N" && (
                    <button type="submit" name="auth" value="N">
                      거절
                    </button>
                  )}
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
