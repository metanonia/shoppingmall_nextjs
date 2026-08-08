import ExcelJS from "exceljs";
import { hashPassword } from "@shoppingmall/auth";
import { prisma } from "@shoppingmall/db";
import { getMemberFormConfig } from "./member";
import { saveMileage, type MileageValidityConfig } from "./mileage";

// Port of managers/member/member_adds.php + member_excel_post.php — same
// positional-column/exceljs approach as goods-excel-import.ts (F4). Two
// legacy behaviors are dropped: the "MD5로 저장" plaintext-password checkbox
// (this repo requires argon2id everywhere, no plaintext path exists to opt
// into) and job/hobby validation against member_form_job_info/
// hobby_info tag lists (those master lists were never ported — see
// migration_deferred_items — so nothing to validate against; values pass
// through as free text instead of being blanked).
export const MEMBER_EXCEL_HEADERS = [
  "이름",
  "아이디",
  "비밀번호",
  "이메일",
  "전화번호",
  "휴대폰번호",
  "우편번호",
  "주소",
  "상세주소",
  "생년월일",
  "양력음력",
  "성별",
  "결혼여부",
  "직업",
  "취미",
  "회사명",
  "사업자번호",
  "대표자명",
  "회사우편번호",
  "회사주소",
  "회사상세주소",
  "업태",
  "종목",
  "이메일수신",
  "SMS수신",
  "등급",
  "마일리지",
  "추가항목1",
  "추가항목2",
  "추가항목3",
  "추가항목4",
  "추가항목5",
] as const;

export type MemberExcelRawRow = {
  name: string;
  id: string;
  passwd: string;
  email: string;
  tel: string;
  cell: string;
  postcode: string;
  address1: string;
  address2: string;
  birth: string;
  birthSl: string;
  gender: string;
  marry: string;
  job: string;
  hobby: string;
  comp: string;
  compNum: string;
  compOwner: string;
  compPostcode: string;
  compAddress1: string;
  compAddress2: string;
  compType: string;
  compItem: string;
  mailling: string;
  sms: string;
  level: string;
  mileage: string;
  add1: string;
  add2: string;
  add3: string;
  add4: string;
  add5: string;
};

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
  return String(value).trim();
}

export async function buildMemberExcelSample(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("sample");
  sheet.addRow([...MEMBER_EXCEL_HEADERS]);
  sheet.addRow([
    "홍길동", // 이름
    "sample_user01", // 아이디
    "Sample1234!", // 비밀번호
    "sample@example.com", // 이메일
    "0212345678", // 전화번호
    "01012345678", // 휴대폰번호
    "06236", // 우편번호
    "서울특별시 강남구 테헤란로 123", // 주소
    "4층", // 상세주소
    "1990-01-01", // 생년월일
    "양력", // 양력음력
    "남성", // 성별
    "미혼", // 결혼여부
    "회사원", // 직업
    "독서", // 취미
    "", // 회사명
    "", // 사업자번호
    "", // 대표자명
    "", // 회사우편번호
    "", // 회사주소
    "", // 회사상세주소
    "", // 업태
    "", // 종목
    "Y", // 이메일수신
    "Y", // SMS수신
    "1", // 등급
    "0", // 마일리지
    "", // 추가항목1
    "", // 추가항목2
    "", // 추가항목3
    "", // 추가항목4
    "", // 추가항목5
  ]);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export type ParsedMemberExcel = { headerOk: boolean; rows: MemberExcelRawRow[] };

export async function parseMemberExcelBuffer(buffer: ArrayBuffer): Promise<ParsedMemberExcel> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headerOk: false, rows: [] };

  const headerRow = sheet.getRow(1);
  const headerOk = MEMBER_EXCEL_HEADERS.every((expected, i) => cellText(headerRow.getCell(i + 1).value) === expected);

  const rows: MemberExcelRawRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells = Array.from({ length: MEMBER_EXCEL_HEADERS.length }, (_, i) => cellText(row.getCell(i + 1).value));
    const [
      name,
      id,
      passwd,
      email,
      tel,
      cell,
      postcode,
      address1,
      address2,
      birth,
      birthSl,
      gender,
      marry,
      job,
      hobby,
      comp,
      compNum,
      compOwner,
      compPostcode,
      compAddress1,
      compAddress2,
      compType,
      compItem,
      mailling,
      sms,
      level,
      mileage,
      add1,
      add2,
      add3,
      add4,
      add5,
    ] = cells;
    if (!name && !id && !email) continue;
    rows.push({
      name,
      id,
      passwd,
      email,
      tel,
      cell,
      postcode,
      address1,
      address2,
      birth,
      birthSl,
      gender,
      marry,
      job,
      hobby,
      comp,
      compNum,
      compOwner,
      compPostcode,
      compAddress1,
      compAddress2,
      compType,
      compItem,
      mailling,
      sms,
      level,
      mileage,
      add1,
      add2,
      add3,
      add4,
      add5,
    });
  }
  return { headerOk, rows };
}

function stripDashes(v: string): string {
  return v.replace(/-/g, "");
}

export async function importMemberExcelRow(
  row: MemberExcelRawRow,
  mileageConfig: MileageValidityConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!row.name || !row.id || !row.passwd || !row.email) return { ok: false, error: "이름/아이디/비밀번호/이메일은 필수입니다." };

  const existing = await prisma.member.findUnique({ where: { id: row.id } });
  if (existing) return { ok: false, error: `이미 존재하는 아이디입니다: ${row.id}` };

  const config = await getMemberFormConfig();
  const passwordHash = await hashPassword(row.passwd);
  const signdate = Math.floor(Date.now() / 1000);
  const levelNum = Number(row.level) || 1;
  const mileageNum = Math.max(0, Math.round(Number(row.mileage) || 0));

  await prisma.member.create({
    data: {
      id: row.id,
      passwd: passwordHash,
      name: row.name,
      email: row.email,
      tel: stripDashes(row.tel),
      cell: stripDashes(row.cell),
      postcode: row.postcode,
      address1: row.address1,
      address2: row.address2,
      birth: row.birth,
      birth_sl: row.birthSl === "양력" ? "S" : row.birthSl === "음력" ? "L" : "N",
      gender: row.gender === "남성" ? "M" : row.gender === "여성" ? "F" : "N",
      marry: row.marry === "기혼" ? "M" : row.marry === "미혼" ? "S" : "N",
      job: row.job,
      hobby: row.hobby,
      comp: row.comp,
      comp_num: stripDashes(row.compNum),
      comp_owner: row.compOwner,
      comp_postcode: row.compPostcode,
      comp_address1: row.compAddress1,
      comp_address2: row.compAddress2,
      comp_type: row.compType,
      comp_item: row.compItem,
      mailling: row.mailling.toUpperCase() === "Y" ? "Y" : "N",
      sms: row.sms.toUpperCase() === "Y" ? "Y" : "N",
      level: levelNum > 99 ? 1 : levelNum,
      mileage: mileageNum,
      add1: row.add1,
      add2: row.add2,
      add3: row.add3,
      add4: row.add4,
      add5: row.add5,
      auth: config.memberAuthAuto ? "Y" : "N",
      signdate,
    },
  });

  if (mileageNum > 0) await saveMileage(row.id, mileageNum, "마일리지 이전", mileageConfig);

  return { ok: true };
}
