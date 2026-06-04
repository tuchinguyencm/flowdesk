// FlowDesk Service Worker
const CACHE = 'flowdesk-v1'
const OFFLINE_PAGES = ['/today', '/archive', '/projects', '/calendar']

// ── Install: pre-cache shell ──────────────────────────────────────
self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(OFFLINE_PAGES).catch(() => {}))
  )
})

// ── Activate: clean old caches ────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ── Fetch: network-first, cache fallback ──────────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = e.request.url
  // Skip Supabase API, Next.js internals, extension requests
  if (url.includes('supabase.co')) return
  if (url.includes('/_next/webpack-hmr')) return
  if (!url.startsWith(self.location.origin)) return

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful HTML/JS/CSS responses
        if (res.ok && ['document', 'script', 'style'].includes(e.request.destination)) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// ── Push: show notification ───────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return

  let payload = { title: 'FlowDesk', body: 'Có thông báo mới', url: '/today' }
  try { payload = { ...payload, ...e.data.json() } } catch {}

  e.waitUntil(
    self.registration.showNotification(payload.title, {
      body:    payload.body,
      icon:    '/icons/icon.svg',
      badge:   '/icons/icon.svg',
      data:    { url: payload.url },
      vibrate: [200, 100, 200],
      actions: [{ action: 'open', title: 'Mở FlowDesk' }],
    })
  )
})

// ── Notification click: focus or open window ──────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/today'

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
