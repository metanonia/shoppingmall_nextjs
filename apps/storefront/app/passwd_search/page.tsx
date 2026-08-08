import { PasswdSearchForm } from "@/components/PasswdSearchForm";

// Port of php/passwd_search.php + passwd_search_step_json.php.
export default function PasswdSearchPage() {
  return (
    <div id="contents">
      <h2 className="contentTitle">비밀번호 찾기</h2>
      <PasswdSearchForm />
    </div>
  );
}
