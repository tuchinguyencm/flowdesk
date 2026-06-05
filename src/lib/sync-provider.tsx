'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { initSync, pushUnsyncedData } from '@/lib/sync'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const synced = useRef<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (synced.current !== user.id) {
      synced.current = user.id
      initSync(user.id).catch(console.error)
    }
    const interval = setInterval(() => pushUnsyncedData(user.id).catch(() => {}), 60_000)
    return () => clearInterval(interval)
  }, [user])

  return <>{children}</>
}
