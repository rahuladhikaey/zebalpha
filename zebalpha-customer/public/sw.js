// ZebAlpha Universal Service Worker: Push Notifications + Immutable CDN Image Disk Cache
// Flipkart & Meesho-grade zero-egress repeat media delivery
const MEDIA_CACHE_NAME = "zebalpha-cdn-media-v1";
const MAX_MEDIA_CACHE_ENTRIES = 250;

const STATIC_MEDIA_PATHS = new Set([
  "/official-logo.png",
  "/official-logo-sm.png",
  "/festive-header-bg.jpg",
  "/banner-casual-green.png",
  "/banner-retro-cream.png",
  "/banner-premium-polo.png",
  "/placeholder.jpg",
]);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("zebalpha-") && key !== MEDIA_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function trimMediaCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length > MAX_MEDIA_CACHE_ENTRIES) {
      const excess = keys.length - MAX_MEDIA_CACHE_ENTRIES;
      for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (_) {}
}

// Cache-First strategy for Cloudinary CDN images & static brand artwork (0 bytes on repeat views!)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }

  const isCloudinaryImage = url.hostname === "res.cloudinary.com" && url.pathname.includes("/image/upload/");
  const isStaticBrandMedia = url.origin === self.location.origin && STATIC_MEDIA_PATHS.has(url.pathname);

  if (!isCloudinaryImage && !isStaticBrandMedia) {
    return;
  }

  event.respondWith(
    caches.open(MEDIA_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) {
        return cached;
      }

      try {
        const networkRes = await fetch(req);
        // Cache successful (200) or opaque cross-origin image responses
        if (networkRes && (networkRes.status === 200 || networkRes.type === "opaque")) {
          cache.put(req, networkRes.clone()).then(() => trimMediaCache(cache)).catch(() => {});
        }
        return networkRes;
      } catch (err) {
        if (cached) return cached;
        throw err;
      }
    })
  );
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
      for (let client of windowClients) {
        if (client.url && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
