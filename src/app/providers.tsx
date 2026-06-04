'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { SyncProvider } from '@/lib/sync-provider'
import { PushProvider } from '@/lib/push-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SyncProvider>
          <PushProvider>
            {children}
          </PushProvider>
        </SyncProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
