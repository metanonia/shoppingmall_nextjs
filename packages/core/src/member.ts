import { prisma } from "@shoppingmall/db";
import { hashPassword, verifyPassword } from "@shoppingmall/auth";

export type MemberProfile = {
  id: string;
  name: string;
  email: string;
  tel: string;
  cell: string;
  postcode: string;
  address1: string;
  address2: string;
  mailling: boolean;
  sms: boolean;
  level: number;
  mileage: number;
  snsType: string;
  signdate: number;
};

function toProfile(row: {
  id: string;
  name: string;
  email: string;
  tel: string;
  cell: string;
  postcode: string;
  address1: string;
  address2: string;
  mailling: string;
  sms: string;
  level: number;
  mileage: number;
  sns_type: string;
  signdate: number;
}): MemberProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    tel: row.tel,
    cell: row.cell,
    postcode: row.postcode,
    address1: row.address1,
    address2: row.address2,
    mailling: row.mailling === "Y",
    sms: row.sms === "Y",
    level: row.level,
    mileage: row.mileage,
    snsType: row.sns_type,
    signdate: row.signdate,
  };
}

// Port of php/regist.php's `$item_array` of `member_form_*` flags, scoped to
// the common fields this port implements (tel/cell/address/mail/sms consent).
// The long tail of rarely-used optional fields (birth, gender, marry, job,
// hobby, B2B company fields, 5 admin-defined custom fields) isn't wired up —
// see MIGRATION.md / migration_deferred_items memory.
export type MemberFormConfig = {
  telRequired: 0 | 1 | 2;
  cellRequired: 0 | 1 | 2;
  addressRequired: 0 | 1 | 2;
  maillingEnabled: boolean;
  smsEnabled: boolean;
  memberAuthAuto: boolean;
  loginLimitCount: number;
  loginLimitMinutes: number;
  agreementTerms: string;
  agreementPrivacy: string;
};

// Port of the member/agreement settings row — legacy stores these in
// mallRN_configuration WHERE uid=2 (a second row in the same wide table
// php/init.php:85's shop_config/uid=1 also uses), not a separate table.
export async function getMemberFormConfig(): Promise<MemberFormConfig> {
  const row = await prisma.configuration.findUnique({ where: { uid: 2 } });
  return {
    telRequired: (row?.member_form_tel ?? 0) as 0 | 1 | 2,
    cellRequired: (row?.member_form_cell ?? 0) as 0 | 1 | 2,
    addressRequired: (row?.member_form_address ?? 0) as 0 | 1 | 2,
    maillingEnabled: (row?.member_form_mailling ?? 0) > 0,
    smsEnabled: (row?.member_form_sms ?? 0) > 0,
    memberAuthAuto: (row?.member_auth ?? "A") === "A",
    loginLimitCount: row?.member_limit_count ?? 0,
    loginLimitMinutes: row?.member_limit_minute ?? 0,
    agreementTerms: row?.agreement_info1 ?? "",
    agreementPrivacy: row?.agreement_info3 ?? "",
  };
}

export type AgreementPages = { terms: string; privacy: string };

// Port of php/agreement.php / privacy.php's source rows — full-page rich
// text, distinct from getMemberFormConfig's agreement_info1/3 (registration
// checkbox summary text). Both live in the same uid=2 row.
export async function getAgreementPages(): Promise<AgreementPages> {
  const row = await prisma.configuration.findUnique({ where: { uid: 2 } });
  return { terms: row?.agreement_info1 ?? "", privacy: row?.agreement_info2 ?? "" };
}

export async function updateAgreementPages(input: AgreementPages): Promise<void> {
  await prisma.configuration.update({ where: { uid: 2 }, data: { agreement_info1: input.terms, agreement_info2: input.privacy } });
}

export type RegisterMemberInput = {
  id: string;
  password: string;
  name: string;
  email: string;
  tel?: string;
  cell?: string;
  postcode?: string;
  address1?: string;
  address2?: string;
  mailling?: boolean;
  sms?: boolean;
  isMobile?: boolean;
};

export type RegisterMemberResult = { ok: true; profile: MemberProfile } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Port of php/regist_post.php's mode=new. Welcome mileage/coupon issuance and
// the join notification email/SMS/FCM push are skipped — mallRN_coupon_manager
// doesn't exist yet and notification sending is Phase 5 (payment/alerts).
export async function registerMember(input: RegisterMemberInput): Promise<RegisterMemberResult> {
  if (!input.id || !input.password || !input.name || !input.email) {
    return { ok: false, error: "필수 정보가 제대로 넘어오지 못했습니다." };
  }
  if (!EMAIL_RE.test(input.email)) {
    return { ok: false, error: `${input.email} 은 존재하지 않는 메일주소입니다.` };
  }

  const existing = await prisma.member.findUnique({ where: { id: input.id } });
  if (existing) {
    return { ok: false, error: `${input.id}는 사용하실 수 없는 아이디 입니다.` };
  }

  const config = await getMemberFormConfig();
  const passwordHash = await hashPassword(input.password);
  const now = Math.floor(Date.now() / 1000);

  const row = await prisma.member.create({
    data: {
      id: input.id,
      passwd: passwordHash,
      name: input.name,
      email: input.email,
      tel: input.tel ?? "",
      cell: input.cell ?? "",
      postcode: input.postcode ?? "",
      address1: input.address1 ?? "",
      address2: input.address2 ?? "",
      mailling: input.mailling ? "Y" : "N",
      mailling_date: now,
      sms: input.sms ? "Y" : "N",
      sms_date: now,
      level: 1,
      cnts: 1,
      login_time: now,
      mobile: input.isMobile ? "Y" : "N",
      auth: config.memberAuthAuto ? "Y" : "N",
      signdate: now,
    },
  });

  return { ok: true, profile: toProfile(row) };
}

export type LoginResult =
  | { ok: true; profile: MemberProfile }
  | { ok: false; error: string; lockedUntil?: Date };

// Port of php/login_post.php. Dormant-account (`mallRN_member_sleep`)
// fallback isn't implemented — that table doesn't exist yet, see
// MIGRATION.md.
export async function authenticateMember(id: string, password: string): Promise<LoginResult> {
  const row = await prisma.member.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." };

  const config = await getMemberFormConfig();
  const now = Math.floor(Date.now() / 1000);

  if (config.loginLimitCount > 0 && row.fail_cnts >= config.loginLimitCount) {
    const unlockAt = row.fail_time + config.loginLimitMinutes * 60;
    if (unlockAt > now) {
      return {
        ok: false,
        error: `비밀번호 ${config.loginLimitCount}회 연속실패로 로그인이 일시 중지 되었습니다.`,
        lockedUntil: new Date(unlockAt * 1000),
      };
    }
  }

  if (row.auth === "N") {
    return { ok: false, error: "아직 회원 미승인 상태입니다. 관리자에게 문의 바랍니다." };
  }

  const valid = await verifyPassword(row.passwd, password);
  if (!valid) {
    const failCnts = row.fail_time + config.loginLimitMinutes * 60 < now ? 1 : row.fail_cnts + 1;
    await prisma.member.update({ where: { id }, data: { fail_cnts: failCnts, fail_time: now } });
    return { ok: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." };
  }

  const updated = await prisma.member.update({
    where: { id },
    data: { fail_cnts: 0, fail_time: 0, cnts: { increment: 1 }, login_time: now },
  });

  return { ok: true, profile: toProfile(updated) };
}

export async function getMemberProfile(id: string): Promise<MemberProfile | null> {
  const row = await prisma.member.findUnique({ where: { id } });
  return row ? toProfile(row) : null;
}

// Port of lib/checkLogin.php:34 `SELECT * FROM mallRN_member_level WHERE level = ...`
// -> $my_discount. Coupon-aware pricing still isn't implemented (see pricing.ts).
export async function getMemberDiscountPct(level: number): Promise<number> {
  const row = await prisma.memberLevel.findFirst({ where: { level } });
  return row?.discount ?? 0;
}

export type UpdateMemberInput = {
  name?: string;
  email?: string;
  tel?: string;
  cell?: string;
  postcode?: string;
  address1?: string;
  address2?: string;
  mailling?: boolean;
  sms?: boolean;
};

// Port of php/regist_post.php's mode=modify.
export async function updateMemberProfile(id: string, input: UpdateMemberInput): Promise<MemberProfile | null> {
  const now = Math.floor(Date.now() / 1000);
  const row = await prisma.member.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.tel !== undefined && { tel: input.tel }),
      ...(input.cell !== undefined && { cell: input.cell }),
      ...(input.postcode !== undefined && { postcode: input.postcode }),
      ...(input.address1 !== undefined && { address1: input.address1 }),
      ...(input.address2 !== undefined && { address2: input.address2 }),
      ...(input.mailling !== undefined && { mailling: input.mailling ? "Y" : "N", mailling_date: now }),
      ...(input.sms !== undefined && { sms: input.sms ? "Y" : "N", sms_date: now }),
    },
  });
  return toProfile(row);
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

// Port of php/regist_post.php's mode=passwd.
export async function changeMemberPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const row = await prisma.member.findUnique({ where: { id }, select: { passwd: true, sns_type: true } });
  if (!row) return { ok: false, error: "등록된 회원이 아닙니다." };

  if (!row.sns_type) {
    const valid = await verifyPassword(row.passwd, currentPassword);
    if (!valid) return { ok: false, error: "비밀번호가 일치 하지 않습니다." };
  }

  await prisma.member.update({ where: { id }, data: { passwd: await hashPassword(newPassword) } });
  return { ok: true };
}

export type WithdrawResult = { ok: true } | { ok: false; error: string };

// Port of php/regist_post.php's mode=withdrawal. Legacy also inserts an audit
// row into mallRN_member_withdrawal and scrubs the member's id out of
// order/coupon/mileage/review/inquiry/board rows — none of those tables
// exist yet (orders are Phase 4, board is Phase 6), so this is just the
// account deletion itself for now.
export async function withdrawMember(
  id: string,
  currentPassword: string,
  reason: string,
): Promise<WithdrawResult> {
  const row = await prisma.member.findUnique({ where: { id }, select: { level: true, passwd: true, sns_type: true } });
  if (!row) return { ok: false, error: "등록된 회원이 아닙니다." };
  if (row.level >= 99) return { ok: false, error: "관리자는 회원탈퇴가 되지 않습니다." };

  if (!row.sns_type) {
    const valid = await verifyPassword(row.passwd, currentPassword);
    if (!valid) return { ok: false, error: "비밀번호가 일치 하지 않습니다." };
  }

  await prisma.member.delete({ where: { id } });
  return { ok: true };
}

// Port of plugin/social/*_login.php's find-or-create-by-sns_id step (each
// provider's callback does the same lookup after exchanging its own token).
export async function findOrCreateSocialMember(
  snsType: string,
  snsId: string,
  profile: { name: string; email?: string },
): Promise<MemberProfile> {
  const existing = await prisma.member.findFirst({ where: { sns_type: snsType, sns_id: snsId } });
  if (existing) return toProfile(existing);

  const now = Math.floor(Date.now() / 1000);
  const generatedId = `${snsType}_${snsId}`.slice(0, 50);
  const row = await prisma.member.create({
    data: {
      id: generatedId,
      passwd: await hashPassword(crypto.randomUUID()),
      name: profile.name,
      email: profile.email ?? "",
      sns_type: snsType,
      sns_id: snsId,
      sns_name: profile.name,
      level: 1,
      cnts: 1,
      login_time: now,
      auth: "Y",
      signdate: now,
    },
  });
  return toProfile(row);
}
