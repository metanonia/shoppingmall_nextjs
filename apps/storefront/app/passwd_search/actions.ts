"use server";

import { lookupPasswordResetTargets, requestPasswordResetCode, resetPasswordWithCode, type PasswordResetChannel } from "@shoppingmall/core";

// Port of php/passwd_search_step_json.php's 3-step flow. Called directly
// from client event handlers (not bound to a <form action>), so these stay
// plain async functions rather than the (prevState, formData) shape —
// same precedent as app/order/pay/actions.ts's abandonPendingPayment.
export async function lookupPasswordResetTargetsAction(id: string, name: string) {
  return lookupPasswordResetTargets(id, name);
}

export async function requestPasswordResetCodeAction(id: string, name: string, channel: PasswordResetChannel) {
  return requestPasswordResetCode(id, name, channel);
}

export async function resetPasswordWithCodeAction(id: string, code: string, newPassword: string) {
  return resetPasswordWithCode(id, code, newPassword);
}
