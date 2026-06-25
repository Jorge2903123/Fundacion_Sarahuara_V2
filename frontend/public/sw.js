const CACHE = 'sarahuaro-v1'
const ASSETS = ['/', '/manifest.json', '/sarahuaro-logo.jpg']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  if (url.pathname.startsWith('/api/')) {
    return
  } else {
    e.respondWith(cacheFirst(request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((cache) => cache.put(request, clone))
    }
    return res
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const res = await fetch(request)
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then((cache) => cache.put(request, clone))
    }
    return res
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
