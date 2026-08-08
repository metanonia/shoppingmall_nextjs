"use client";

import { useActionState } from "react";

type ImportState = {
  error?: string;
  summary?: { total: number; success: number; failed: { row: number; name: string; error: string }[] };
};

// Generic enough to back both goods and member bulk-excel-import screens
// (F4/H4) — only the label copy and failed-row "name" column header differ.
export function GoodsExcelImportForm({
  action,
  sampleHref,
  description = "첫 행은 헤더(변경 불가), 둘째 행부터 상품 데이터를 입력합니다. 상세이미지경로만 입력하면 목록/작은목록 이미지는 자동으로 같은 이미지를 사용합니다.",
  submitLabel = "상품 등록하기",
  nameColumnLabel = "상품명",
}: {
  action: (prevState: ImportState, formData: FormData) => Promise<ImportState>;
  sampleHref: string;
  description?: string;
  submitLabel?: string;
  nameColumnLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(action, {});

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: "#666" }}>
        <a href={sampleHref}>엑셀 샘플 다운로드</a>
        <div style={{ marginTop: 4 }}>{description}</div>
      </div>

      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
        <input type="file" name="excel" accept=".xlsx,.xls" required />
        {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
        <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
          {pending ? "등록 중..." : submitLabel}
        </button>
      </form>

      {state.summary && (
        <div style={{ marginTop: 24 }}>
          <div>
            전체 {state.summary.total}건 중 <b>{state.summary.success}건 성공</b>, {state.summary.failed.length}건 실패
          </div>
          {state.summary.failed.length > 0 && (
            <table style={{ width: "100%", marginTop: 8 }}>
              <thead>
                <tr>
                  <th>행</th>
                  <th>{nameColumnLabel}</th>
                  <th>오류</th>
                </tr>
              </thead>
              <tbody>
                {state.summary.failed.map((f) => (
                  <tr key={f.row}>
                    <td>{f.row}</td>
                    <td>{f.name || "(비어있음)"}</td>
                    <td style={{ color: "#e02020" }}>{f.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
