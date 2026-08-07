import { getExhibitionList } from "@shoppingmall/core";
import { Pagination } from "@/components/Pagination";

// Port of php/exhibition_list.php — a simple gallery of all exhibitions
// (any status; legacy defines a status badge but the skin never renders it,
// so this doesn't either — see the migration notes in exhibition.ts).
export default async function ExhibitionListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const limit = Number(params.limit) || 12;
  const page = Number(params.page) || 1;

  const result = await getExhibitionList(page, limit);
  const makeHref = (p: number) => `/exhibition_list?limit=${limit}&page=${p}`;

  return (
    <div id="contents">
      <h2 className="contentTitle">모음전</h2>
      <div className="empty40" />

      <div className="listTopTitle fontSCDream">
        전체 <b id="listTotal">{result.total}</b>
      </div>
      <div className="empty20" />

      <div id="listArea">
        {result.items.length === 0 ? (
          <div className="emptyList fontSCDream weight300">등록된 모음전이 없습니다.</div>
        ) : (
          result.items.map((ex) => (
            <div key={ex.uid} className="itemBox">
              <div className="item">
                <ul>
                  <li>
                    <a href={`/exhibition/${ex.uid}`}>
                      {ex.image ? (
                        <img src={ex.image} alt={ex.name} />
                      ) : (
                        <div className="jb-table">
                          <div className="jb-table-row">
                            <div className="jb-table-cell">
                              <div className="text">{ex.name}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </a>
                  </li>
                  <li>
                    <a href={`/exhibition/${ex.uid}`}>{ex.name}</a>
                  </li>
                  {ex.dateRange && <li className="date">{ex.dateRange}</li>}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="empty30" />
      <div className="paging">
        <Pagination page={result.page} totalPages={result.totalPages} makeHref={makeHref} />
      </div>
    </div>
  );
}
