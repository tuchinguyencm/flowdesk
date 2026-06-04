'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { initSync } from '@/lib/sync'

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const synced = useRef<string | null>(null)

  useEffect(() => {
    if (user && synced.current !== user.id) {
      synced.current = user.id
      initSync(user.id).catch(console.error)
    }
  }, [user])

  return <>{children}</>
}
