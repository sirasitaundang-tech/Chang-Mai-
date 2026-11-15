// Service worker: เปิดหน้าเว็บได้แม้ไม่มีสัญญาณ
// หน้า HTML: ลองเน็ตก่อน (เห็นฉบับใหม่ทันที) ไม่มีเน็ตค่อยใช้ที่เก็บไว้ / ไฟล์อื่น: แสดงที่เก็บไว้ก่อน แล้วอัปเดตเบื้องหลัง
const CACHE = "cm-trip-v2";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  // เก็บทีละไฟล์: ไฟล์ไหนหาย (เช่นไอคอน) ไม่ทำให้ติดตั้งล้มทั้งชุด
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  // เก็บเฉพาะหน้าเว็บเอง และสคริปต์ socket.io จาก CDN — ส่วนซิงค์/คำนวณเส้นทางไปที่เซิร์ฟเวอร์ตรง ๆ
  if (u.origin !== self.location.origin && u.hostname !== "cdn.socket.io") return;
  const page = req.mode === "navigate";
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req, { ignoreSearch: true }).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
          return res;
        });
        if (page) {
          const t = new Promise((ok) => setTimeout(ok, 3500, null));
          return Promise.race([net.catch(() => null), t]).then((res) => res || hit || net.catch(() => Response.error()));
        }
        return hit || net.catch(() => Response.error());
      })
    )
  );
});
