import { ExhibitionForm } from "@/components/ExhibitionForm";

export default function NewExhibitionPage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>기획전 등록</h1>
      <ExhibitionForm initial={null} />
    </div>
  );
}
