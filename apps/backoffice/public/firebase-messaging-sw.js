/* Firebase getToken()에 전달되는 동일 출처 Service Worker입니다. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { notification: { body: event.data.text() } }; }
  const notification = payload.notification || (payload.data && payload.data.notification) || {};
  const title = notification.title || "쇼핑몰 알림";
  event.waitUntil(self.registration.showNotification(title, {
    body: notification.body || "",
    icon: notification.icon || "/favicon.ico",
    data: { url: notification.click_action || (payload.data && payload.data.url) || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url === target);
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});
