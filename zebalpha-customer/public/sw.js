// ZebAlpha Universal Service Worker for Push Notifications (Flipkart & Meesho Grade)
const CACHE_NAME = "zebalpha-push-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push notifications
self.addEventListener("push", (event) => {
  let data = {
    title: "ZebAlpha Drop Alert ✦",
    body: "New curated streetwear collection just dropped! Check it out now.",
    icon: "/official-logo-sm.png",
    badge: "/official-logo-sm.png",
    url: "/notifications",
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (_) {
      try {
        data.body = event.data.text();
      } catch (e) {}
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/official-logo-sm.png",
    badge: data.badge || "/official-logo-sm.png",
    image: data.image || undefined,
    data: {
      url: data.url || "/notifications",
      dateOfArrival: Date.now(),
    },
    vibrate: [200, 80, 200],
    actions: [
      { action: "explore", title: "View Drop ✦" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle tap on phone notification bar
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const targetUrl = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If a tab is already open, focus it and navigate
      for (let client of windowClients) {
        if (client.url && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

