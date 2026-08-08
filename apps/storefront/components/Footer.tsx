import Link from "next/link";
import type { BankAccount, ShopConfig } from "@shoppingmall/core";

const BACKOFFICE_URL = (process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001").replace(/\/$/, "");

// Port of bottom.html (PC) / mobile_bottom.html. Peripheral floating widgets
// (recent-view drawer, popup ads, back-to-top button) need cross-cutting
// infra (recent-view tracking cookie, popup admin config) that's explicitly
// out of Phase 1 scope — see the migration plan — so only the primary
// content block (nav links, CS/company info, bank accounts, copyright) is
// ported here.
export function Footer({
  config,
  bankAccounts,
  device,
}: {
  config: ShopConfig;
  bankAccounts: BankAccount[];
  device: "pc" | "mobile";
}) {
  const hasReturnAddress = Boolean(config.compRtnAddress1);

  if (device === "mobile") {
    return (
      <div id="footer" className="clearfix">
        <div className="copyText">
          <div className="copyCsCenter">
            <div>CS CENTER</div>
            <p>{config.compTel}</p>
            <p>
              MON FRI <span>{config.csTime1}</span>
            </p>
            <p>
              SAT <span>{config.csTime2}</span>
            </p>
            <p>
              SUN/HOLIDAY <span>{config.csTime3}</span>
            </p>
            <p>
              LUNCH <span>{config.csTime4}</span>
            </p>
          </div>
          <div className="copyBankAccount">
            <div>BANK ACCOUNT</div>
            {bankAccounts.map((b) => (
              <p key={b.bankNum}>
                {b.bankName}&nbsp;&nbsp;{b.bankNum}&nbsp;&nbsp;{b.bankOwner}
              </p>
            ))}
          </div>
        </div>

        <div className="copyMenu">
          <ul>
            <li style={{ paddingLeft: 0 }}>
              <Link href="/">HOME</Link>
            </li>
            <li>
              <Link href="/agreement">AGREEMENT</Link>
            </li>
            <li className="weight500">
              <Link href="/privacy">PRIVACY POLICY</Link>
            </li>
            <li>
              <Link href="/cs_center">CS CENTER</Link>
            </li>
          </ul>
        </div>

        <div className="empty20" />

        <div className="copyText">
          <div className="copyCompanyInformation">
            <p>
              CAMPANY&nbsp;&nbsp;<span>{config.compName}</span>&nbsp;&nbsp;&nbsp;&nbsp;OWNER&nbsp;&nbsp;
              <span>{config.compOwner}</span>
            </p>
            <p>
              BUSINESS LICENSE&nbsp;&nbsp;<span>{config.compLicenseNo1}</span>
            </p>
            <p>
              MAIL-ORDER LICENSE&nbsp;&nbsp;<span>{config.compLicenseNo2}</span>
            </p>
            <p>
              MASTER&nbsp;&nbsp;<span>{config.basicAdmin}</span>&nbsp;&nbsp;&nbsp;&nbsp;E-MAIL&nbsp;&nbsp;
              <a href={`mailto:${config.basicEmail}`}>
                <span>{config.basicEmail}</span>
              </a>
            </p>
            <p>
              FAX&nbsp;&nbsp;<span>{config.compFax}</span>
            </p>
            <p>
              ADDRESS&nbsp;&nbsp;
              <span>
                {config.compAddress1} {config.compAddress2}
              </span>
            </p>
            {hasReturnAddress && (
              <p>
                RETURN ADDRESS&nbsp;&nbsp;
                <span>
                  {config.compRtnAddress1} {config.compRtnAddress2}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="copyRight">
          COPYRIGHT <i className="xi-copyright" />
          &nbsp;&nbsp;
          <b className="smll black">{config.basicName}</b>
          &nbsp;&nbsp;ALL RIGHTS RESERVED.
        </div>
      </div>
    );
  }

  return (
    <div id="footer">
      <div id="copyMenu">
        <ul className="floatLeft" style={{ width: 600 }}>
          <li style={{ paddingLeft: 0 }}>
            <Link href="/">HOME</Link>
          </li>
          <li>
            <Link href="/agreement">AGREEMENT</Link>
          </li>
          <li className="weight500">
            <Link href="/privacy">PRIVACY POLICY</Link>
          </li>
          <li>
            <Link href="/cs_center">CS CENTER</Link>
          </li>
        </ul>
        {config.vendorLink > 0 && (
          <ul className="floatRight">
            <li style={{ paddingLeft: 0 }}>
              <Link href="/regist_vendor">입점신청</Link>
            </li>
            <li>
              <a href={`${BACKOFFICE_URL}/vendor`}>입점사로그인</a>
            </li>
          </ul>
        )}
      </div>

      <div id="copyArea">
        <div id="copyText">
          <div className="copyCsCenter">
            <div>CS CENTER</div>
            <p className="num">{config.compTel}</p>
            <p>
              MON FRI <span className="num">{config.csTime1}</span>
            </p>
            <p>
              SAT <span className="num">{config.csTime2}</span>
            </p>
            <p>
              SUN/HOLIDAY <span>{config.csTime3}</span>
            </p>
            <p>
              LUNCH <span className="num">{config.csTime4}</span>
            </p>
          </div>

          <div className="copyBankAccount">
            <div>BANK ACCOUNT</div>
            {bankAccounts.map((b) => (
              <p key={b.bankNum}>
                {b.bankName}&nbsp;&nbsp;<span className="num">{b.bankNum}</span>&nbsp;&nbsp;{b.bankOwner}
              </p>
            ))}
          </div>

          <div className="copyCompanyInformation">
            <div>COMPANY INFORMATION</div>
            <p>
              CAMPANY&nbsp;&nbsp;<span>{config.compName}</span>&nbsp;&nbsp;&nbsp;&nbsp;OWNER&nbsp;&nbsp;
              <span>{config.compOwner}</span>
            </p>
            <p>
              BUSINESS LICENSE&nbsp;&nbsp;<span className="num">{config.compLicenseNo1}</span>
              &nbsp;&nbsp;&nbsp;&nbsp;MAIL-ORDER LICENSE&nbsp;&nbsp;<span>{config.compLicenseNo2}</span>
            </p>
            <p>
              ADDRESS&nbsp;&nbsp;
              <span>
                {config.compAddress1} {config.compAddress2}
              </span>
              &nbsp;&nbsp;&nbsp;&nbsp;FAX&nbsp;&nbsp;<span className="num">{config.compFax}</span>
            </p>
            {hasReturnAddress && (
              <p>
                RETURN ADDRESS&nbsp;&nbsp;
                <span>
                  {config.compRtnAddress1} {config.compRtnAddress2}
                </span>
              </p>
            )}
            <p>
              MASTER&nbsp;&nbsp;<span>{config.basicAdmin}</span>&nbsp;&nbsp;&nbsp;&nbsp;E-MAIL&nbsp;&nbsp;
              <a href={`mailto:${config.basicEmail}`}>
                <span>{config.basicEmail}</span>
              </a>
            </p>
          </div>
        </div>

        <div id="copyRight" className="gdDefault">
          COPYRIGHT <i className="xi-copyright" />
          &nbsp;&nbsp;{config.basicName}&nbsp;&nbsp;ALL RIGHTS RESERVED.
        </div>
      </div>
    </div>
  );
}
