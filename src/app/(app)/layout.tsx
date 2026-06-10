'use client'
import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { QuickAddModal } from '@/components/quick-add/quick-add-modal'
import { UserGuard } from '@/components/auth/user-guard'
import { useUIStore } from '@/store'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen   = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768)
  }, [setSidebarOpen])

  return (
    <UserGuard>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleSidebar}
          />
        )}

        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Mobile top bar */}
          <header
            className="flex items-center gap-3 px-4 h-12 shrink-0 md:hidden"
            style={{ background: 'var(--sidebar)', borderBottom: '1px solid #1e293b' }}
          >
            <button
              onClick={toggleSidebar}
              className="text-[#94a3b8] hover:text-white transition-colors text-xl leading-none"
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <span className="text-white font-bold text-sm">FlowDesk</span>
          </header>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>

        <QuickAddModal />
      </div>
    </UserGuard>
  )
}
