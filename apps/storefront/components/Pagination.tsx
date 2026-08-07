// Port of lib/class.ListPaging.php's print_page() output (the `.pageList` /
// `.number` / `.selected` / `.prevPage` / `.nextPage` markup/classes), as
// plain numbered links. Legacy's default PAGING_TYPE is 1 ("pageline"), a
// jquery.timeliny.js scrubber widget fed by a JSON AJAX endpoint — not
// ported; numbered pages are simpler and need no client JS to work.
export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pageLinkNum = 10;
  const block = Math.ceil(page / pageLinkNum);
  const totalBlock = Math.ceil(totalPages / pageLinkNum);
  const pageEnd = Math.min(block * pageLinkNum, totalPages);
  const pageStart = pageEnd - pageLinkNum + 1;
  const prevPage = block * pageLinkNum - pageLinkNum;
  const nextPage = pageEnd + 1;

  const pages = [];
  for (let i = pageStart; i <= pageEnd; i++) pages.push(i);

  return (
    <div className="pageList">
      {block > 1 ? (
        <>
          <a href={makeHref(prevPage)} className="prevPage">
            <i className="xi-angle-left-thin" />
          </a>
          <a href={makeHref(1)} className="number">
            1
          </a>
          <span className="jumjum">
            <i className="xi-ellipsis-h" />
          </span>
        </>
      ) : (
        <span className="prevPage">
          <i className="xi-angle-left-thin" />
        </span>
      )}

      {pages.map((i) =>
        i === page ? (
          <span key={i} className="selected">
            {i}
          </span>
        ) : (
          <a key={i} href={makeHref(i)} className="number">
            {i}
          </a>
        ),
      )}

      {block < totalBlock ? (
        <>
          <span className="jumjum">
            <i className="xi-ellipsis-h" />
          </span>
          <a href={makeHref(totalPages)} className="number">
            {totalPages}
          </a>
          <a href={makeHref(nextPage)} className="nextPage">
            <i className="xi-angle-right-thin" />
          </a>
        </>
      ) : (
        <span className="nextPage">
          <i className="xi-angle-right-thin" />
        </span>
      )}
    </div>
  );
}
