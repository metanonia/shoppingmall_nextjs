import { notFound } from "next/navigation";
import { getActiveEventDiscounts, getExhibitionDetail, priceLimitConfigFrom } from "@shoppingmall/core";
import { getCachedMemberDiscountPct, getCachedShopConfig, getDevice } from "@/lib/request";
import { GoodsGrid } from "@/components/GoodsGrid";
import { Pagination } from "@/components/Pagination";
import { ExhibitionGroups } from "@/components/ExhibitionGroups";

// Port of php/exhibition.php.
export default async function ExhibitionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { uid } = await params;
  const uidNum = Number(uid);
  if (!Number.isInteger(uidNum)) notFound();

  const sp = await searchParams;
  const limit = Number(sp.limit) || 12;
  const page = Number(sp.page) || 1;

  const [device, config, memberDiscountPct] = await Promise.all([
    getDevice(),
    getCachedShopConfig(),
    getCachedMemberDiscountPct(),
  ]);
  const eventDiscounts = await getActiveEventDiscounts();
  const detail = await getExhibitionDetail(
    uidNum,
    page,
    limit,
    eventDiscounts,
    priceLimitConfigFrom(config),
    memberDiscountPct,
  );
  if (!detail) notFound();

  if (detail.ended) {
    return (
      <div id="contents">
        <div className="empty40" />
        <div className="emptyList">{detail.name} 모음전이 종료 되었습니다.</div>
      </div>
    );
  }

  const makeHref = (p: number) => `/exhibition/${uidNum}?limit=${limit}&page=${p}`;

  return (
    <div id="contents">
      <h2 className="contentTitle">{detail.name}</h2>
      <div className="fontSCDream addPage" dangerouslySetInnerHTML={{ __html: detail.explainsHtml }} />

      {detail.groups ? (
        <ExhibitionGroups groups={detail.groups} />
      ) : detail.flatGoods ? (
        <>
          <div className="empty40" />
          <div className="listTopTitle fontSCDream">
            전체 <b id="listTotal">{detail.flatGoods.total}</b>
          </div>
          <div className="empty20" />
          <GoodsGrid goods={detail.flatGoods.items} device={device} />
          <div className="empty30" />
          <div className="paging">
            <Pagination page={detail.flatGoods.page} totalPages={detail.flatGoods.totalPages} makeHref={makeHref} />
          </div>
        </>
      ) : null}
    </div>
  );
}
