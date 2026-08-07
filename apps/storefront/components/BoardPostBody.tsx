import type { BoardId, PostDetail } from "@shoppingmall/core";
import { boardFileUrl } from "@/lib/board-file-url";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

// Shared between the server-rendered detail page (post already viewable on
// first fetch) and SecretPostUnlock.tsx (post revealed client-side after a
// guest enters the correct password) — see app/board/[boardId]/[uid]/page.tsx.
export function BoardPostBody({ boardId, detail }: { boardId: BoardId; detail: PostDetail }) {
  return (
    <div>
      <h3>{detail.subject}</h3>
      <div className="colorGray size12">
        {detail.authorName} · {formatDate(detail.signdate)} · 조회 {detail.viewCount}
      </div>
      <div className="empty20" />
      <div style={{ whiteSpace: "pre-wrap" }}>{detail.content}</div>

      {detail.files.length > 0 && (
        <div className="empty20">
          {detail.files.map((filename) => {
            const url = boardFileUrl(boardId, detail.uid, filename);
            const ext = filename.split(".").pop()?.toLowerCase() ?? "";
            return IMAGE_EXTENSIONS.has(ext) ? (
              <img key={filename} src={url} alt={detail.subject} style={{ maxWidth: "100%", display: "block", marginBottom: 10 }} />
            ) : (
              <div key={filename}>
                <a href={url} target="_blank" rel="noreferrer">
                  {filename}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
