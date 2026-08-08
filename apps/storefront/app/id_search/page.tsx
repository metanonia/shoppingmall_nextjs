import { IdSearchForm } from "@/components/IdSearchForm";

// Port of php/id_search_post.php (name+email lookup).
export default function IdSearchPage() {
  return (
    <div id="contents">
      <h2 className="contentTitle">아이디 찾기</h2>
      <IdSearchForm />
    </div>
  );
}
