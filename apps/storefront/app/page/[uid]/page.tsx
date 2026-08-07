import { notFound } from "next/navigation";
import { getAddPage } from "@shoppingmall/core";

// Port of php/add_page.php.
export default async function AddPagePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const page = await getAddPage(uid);
  if (!page) notFound();

  return (
    <div id="contents">
      <h2 className="contentTitle">{page.title}</h2>
      <div className="empty30" />
      {page.imageOnly ? (
        <div>
          {page.imageUrls.map((url, i) => (
            <div key={url}>
              <img src={url} alt={`${page.title} #${i + 1}`} style={{ maxWidth: "100%", display: "block" }} />
              {page.imageGap && <div style={{ height: 20 }} />}
            </div>
          ))}
        </div>
      ) : (
        <div dangerouslySetInnerHTML={{ __html: page.explainsHtml ?? "" }} />
      )}
    </div>
  );
}
