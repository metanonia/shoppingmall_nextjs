import { AddPageForm } from "@/components/AddPageForm";

export default function NewAddPagePage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>정적페이지 등록</h1>
      <AddPageForm initial={null} />
    </div>
  );
}
