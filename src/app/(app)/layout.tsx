import { Sidebar } from '@/components/layout/sidebar'
import { QuickAddModal } from '@/components/quick-add/quick-add-modal'
import { UserGuard } from '@/components/auth/user-guard'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserGuard>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <QuickAddModal />
      </div>
    </UserGuard>
  )
}
