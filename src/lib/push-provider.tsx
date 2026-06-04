'use client'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function registerSW() {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (err) {
    console.error('[SW]', err)
  }
}

async function subscribePush(userId: string) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return   // VAPID not configured → skip silently

  if (!('PushManager' in window)) return
  if (Notification.permission === 'denied') return

  try {
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()

    if (!sub) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      sub = await reg.pushManager.subscribe({
        userVisibleOnly:    true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }

    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId, subscription: sub.toJSON() }),
    })
  } catch (err) {
    console.error('[Push]', err)
  }
}

export function PushProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Register SW silently on first mount
  useEffect(() => { registerSW() }, [])

  // Subscribe to push when user logs in (if VAPID is configured)
  useEffect(() => {
    if (user) subscribePush(user.id)
  }, [user])

  return <>{children}</>
}
