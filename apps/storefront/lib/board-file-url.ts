import type { BoardId } from "@shoppingmall/core";

// Split out from board-upload.ts (which imports node:fs/promises) so
// BoardPostBody.tsx — shared between server rendering and the client-side
// SecretPostUnlock.tsx — doesn't drag a Node-only module into the browser
// bundle just to build a URL string.
export function boardFileUrl(boardId: BoardId, postUid: number, filename: string): string {
  return `/uploads/board/${boardId}/${postUid}/${filename}`;
}
