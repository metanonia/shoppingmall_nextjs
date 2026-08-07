import type { ShopConfig } from "./config";

export type BankAccount = { bankName: string; bankNum: string; bankOwner: string };

// Port of php/bottom.php:29-42's payment_bank_info parsing
// ("은행명|계좌번호|예금주명|사용여부|*|은행명|...").
export function getBankAccounts(config: ShopConfig): BankAccount[] {
  if (!config.paymentBankInfo) return [];
  return config.paymentBankInfo
    .split("|*|")
    .map((entry) => entry.split("|"))
    .filter((parts) => parts[3] !== "0" && parts[0])
    .map(([bankName, bankNum, bankOwner]) => ({ bankName, bankNum, bankOwner }));
}

export type TopMenuItem = { label: string; url: string };

// Port of php/top.php:109-138's design_top_menu / mobile_top_menu parsing
// ("메뉴명|메뉴URL|사용여부|*|...").
export function getTopMenu(menuField: string): TopMenuItem[] {
  if (!menuField) return [];
  return menuField
    .split("|*|")
    .map((entry) => entry.split("|"))
    .filter((parts) => parts[2] !== "0" && parts[0])
    .map(([label, url]) => ({ label, url }));
}
