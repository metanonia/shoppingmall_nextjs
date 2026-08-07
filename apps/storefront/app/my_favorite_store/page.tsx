import { redirect } from "next/navigation";
import { getMyFavoriteStores } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

// Port of php/my_favorite_store.php, without the per-vendor top-6-goods
// enrichment — that widget is the same "인기상품" panel goods/[uid] already
// shows, so it isn't duplicated inline here.
export default async function MyFavoriteStorePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_favorite_store");

  const stores = await getMyFavoriteStores(session.userId);

  return (
    <div id="contents">
      <h2 className="contentTitle">관심스토어</h2>
      <div className="empty30" />
      {stores.length === 0 ? (
        <div className="emptyList">관심스토어로 등록한 스토어가 없습니다.</div>
      ) : (
        <ul>
          {stores.map((s) => (
            <li key={s.vendor} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <a href={`/store?vendor=${s.vendor}`} className="underLine">
                {s.storeName}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
