"use client";

import { useEffect, useState } from "react";
import type { FirebaseWebConfig } from "@shoppingmall/core";

type TokenState = { enabled: boolean; pc: string; mobile: string };

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export async function issueFirebaseToken(config: FirebaseWebConfig): Promise<string> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
  if (!config.apiKey || !config.projectId || !config.messagingSenderId || !config.appId || !config.vapidKey) throw new Error("Firebase 웹 설정을 먼저 입력해 주세요.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("브라우저 알림 권한을 허용해 주세요.");
  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
  if (!(await isSupported())) throw new Error("이 브라우저에서는 Firebase 메시징을 사용할 수 없습니다.");
  const app = getApps()[0] ?? initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, storageBucket: config.storageBucket, messagingSenderId: config.messagingSenderId, appId: config.appId });
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  const token = await getToken(getMessaging(app), { vapidKey: config.vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("FCM 토큰을 발급받지 못했습니다.");
  return token;
}

export function PushAutoRegistration({ action, initial, config }: { action: (formData: FormData) => Promise<void>; initial: TokenState; config: FirebaseWebConfig }) {
  useEffect(() => {
    if (!initial.enabled || Notification.permission !== "granted") return;
    let active = true;
    issueFirebaseToken(config).then(async (token) => {
      if (!active) return;
      const mobile = isMobileBrowser();
      if ((mobile ? initial.mobile : initial.pc) === token) return;
      const payload = new FormData();
      payload.set("enabled", "on");
      payload.set("pc", mobile ? initial.pc : token);
      payload.set("mobile", mobile ? token : initial.mobile);
      await action(payload);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [action, config, initial]);
  return null;
}

export function PushTokenForm({ action, initial, config }: { action: (formData: FormData) => Promise<void>; initial: TokenState; config: FirebaseWebConfig }) {
  const [tokens, setTokens] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      const enabled = formData.get("enabled") === "on";
      let next = tokens;
      if (enabled) {
        const token = await issueFirebaseToken(config);
        next = isMobileBrowser() ? { ...tokens, enabled, mobile: token } : { ...tokens, enabled, pc: token };
      } else {
        next = { ...tokens, enabled };
      }
      const payload = new FormData();
      if (enabled) payload.set("enabled", "on");
      payload.set("pc", next.pc);
      payload.set("mobile", next.mobile);
      await action(payload);
      setTokens(next);
      setMessage(enabled ? "이 브라우저의 푸시 토큰을 자동 등록했습니다." : "푸시 알림을 사용 중지했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "푸시 설정에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  const messageIsError = /실패|먼저|허용|지원하지/.test(message);
  return <form action={submit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 680, marginTop: 16 }}><label><input type="checkbox" name="enabled" defaultChecked={tokens.enabled} /> 푸시 알림 사용</label><label>PC 토큰<input value={tokens.pc} readOnly placeholder="이 PC에서 사용 설정하면 자동 발급됩니다." style={{ width: "100%" }} /></label><label>모바일 토큰<input value={tokens.mobile} readOnly placeholder="모바일에서 사용 설정하면 자동 발급됩니다." style={{ width: "100%" }} /></label><button disabled={pending} style={{ alignSelf: "start" }}>{pending ? "등록 중..." : "이 브라우저에 적용"}</button>{message && <p role="status" style={{ color: messageIsError ? "#b00" : "#176b2c" }}>{message}</p>}<p style={{ color: "#777", fontSize: 12 }}>토큰은 직접 입력하지 않습니다. 브라우저 알림 권한을 허용하면 현재 장치 구분에 맞춰 자동 저장됩니다.</p></form>;
}
