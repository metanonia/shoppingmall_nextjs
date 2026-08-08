import { PopupForm } from "@/components/PopupForm";

export default async function NewPopupPage({ searchParams }: { searchParams: Promise<{ device?: string }> }) {
  const { device: deviceParam } = await searchParams;
  const device = deviceParam === "mobile" ? "mobile" : "pc";

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>팝업 등록 ({device === "mobile" ? "모바일" : "PC"})</h1>
      <PopupForm device={device} initial={null} />
    </div>
  );
}
