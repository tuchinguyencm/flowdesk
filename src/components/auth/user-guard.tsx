'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function UserGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div suppressHydrationWarning className="h-screen flex items-center justify-center">
        <div suppressHydrationWarning className="text-sm text-neutral-400">Đang tải...</div>
      </div>
    )
  }

  if (!user) return null

  return <>{children}</>
}
