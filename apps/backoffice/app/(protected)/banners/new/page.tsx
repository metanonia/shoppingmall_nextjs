import { BannerForm } from "@/components/BannerForm";

export default async function NewBannerPage({ searchParams }: { searchParams: Promise<{ device?: string }> }) {
  const { device: deviceParam } = await searchParams;
  const device = deviceParam === "mobile" ? "mobile" : "pc";

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>배너 등록 ({device === "mobile" ? "모바일" : "PC"})</h1>
      <BannerForm device={device} initial={null} />
    </div>
  );
}
