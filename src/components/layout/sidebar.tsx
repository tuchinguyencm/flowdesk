'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUIStore } from '@/store'
import { useAuth } from '@/lib/auth-context'
import { useProjects } from '@/hooks/use-projects'

const NAV = [
  { href: '/today',    label: 'Hôm nay',  icon: '☀' },
  { href: '/projects', label: 'Dự án',    icon: '⬡' },
  { href: '/calendar', label: 'Lịch',     icon: '◫' },
  { href: '/history',  label: 'Nhật ký',  icon: '≡' },
  { href: '/archive',  label: 'Lưu trữ',  icon: '◧' },
]

export function Sidebar() {
  const pathname       = usePathname()
  const router         = useRouter()
  const openQuickAdd   = useUIStore((s) => s.openQuickAdd)
  const sidebarOpen    = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar  = useUIStore((s) => s.toggleSidebar)
  const { user, signOut } = useAuth()
  const { data: projects = [] } = useProjects(user?.id ?? '')

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside
      className={[
        'w-60 shrink-0 flex flex-col h-full overflow-y-auto overflow-x-hidden',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
        'md:relative md:inset-auto md:z-auto md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      style={{ background: 'var(--sidebar)' }}
    >
      {/* ── Logo ── */}
      <div
        className="px-5 py-5 flex items-center gap-2.5 shrink-0"
        style={{ borderBottom: '1px solid #1e293b' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm leading-tight">FlowDesk</div>
          <div className="text-xs leading-tight" style={{ color: '#94a3b8' }}>
            {user?.email?.split('@')[0] ?? 'Workspace'}
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1 rounded transition-colors text-base leading-none shrink-0"
          style={{ color: '#475569' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569' }}
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* ── Quick add ── */}
      <div className="px-3 pt-3 shrink-0">
        <button
          onClick={() => openQuickAdd('task')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-85"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <span className="text-base leading-none">+</span>
          Thêm mới
          <span className="ml-auto font-normal opacity-60">⌘K</span>
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 pt-3 pb-2 overflow-y-auto">
        {/* Nav label */}
        <div
          className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Chính
        </div>

        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium mb-0.5 transition-colors border-l-[3px]"
              style={{
                color:            active ? '#ffffff' : '#94a3b8',
                background:       active ? '#1e293b' : 'transparent',
                borderLeftColor:  active ? '#6366f1' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#1e293b'
                  e.currentTarget.style.color = '#e2e8f0'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Projects label */}
        <div
          className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: '#475569' }}
        >
          Dự án
        </div>

        {projects.map((p) => {
          const active = pathname === `/projects/${p.id}`
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-colors border-l-[3px]"
              style={{
                color:           active ? '#ffffff' : '#94a3b8',
                background:      active ? '#1e293b' : 'transparent',
                borderLeftColor: active ? '#6366f1' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = '#1e293b'
                  e.currentTarget.style.color = '#e2e8f0'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: p.color }}
              />
              <span className="truncate">{p.name}</span>
            </Link>
          )
        })}

        {projects.length === 0 && (
          <div className="px-3 py-1.5 text-xs italic" style={{ color: '#334155' }}>
            Chưa có dự án
          </div>
        )}

        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] w-full text-left mt-0.5 transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#475569' }}
        >
          + Thêm dự án
        </button>
      </nav>

      {/* ── User footer ── */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid #1e293b' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: '#e2e8f0' }}>
              {user?.email}
            </div>
            <div className="text-[10px]" style={{ color: '#64748b' }}>Admin</div>
          </div>
          <button
            onClick={signOut}
            title="Đăng xuất"
            className="p-1 rounded transition-colors text-xs shrink-0"
            style={{ color: '#475569' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#475569' }}
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
