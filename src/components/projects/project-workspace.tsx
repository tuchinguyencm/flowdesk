'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'
import { useUIStore } from '@/store'
import { ArchiveCard } from '@/components/archive/archive-card'
import { deleteArchiveItem } from '@/hooks/use-archive'
import {
  useProject,
  useProjectTasks,
  useProjectArchive,
  useProjectMeetings,
  moveTask,
  addProjectTask,
} from '@/hooks/use-project-data'
import type { Task, ArchiveItem, Meeting } from '@/types'

// ── Campaign phases ───────────────────────────────────────────────
const PHASES = [
  { id: 'design',    label: 'Thiết kế hệ thống', color: '#8B5CF6' },
  { id: 'marketing', label: 'Chạy chiến dịch',   color: '#378ADD' },
  { id: 'content',   label: 'Tạo nội dung',       color: '#1D9E75' },
  { id: 'measure',   label: 'Đo lường',           color: '#D85A30' },
]

type Tab = 'tasks' | 'archive' | 'meetings'

// ── Root component ────────────────────────────────────────────────
export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { user } = useAuth()
  const openQuickAdd = useUIStore((s) => s.openQuickAdd)

  const project  = useProject(projectId)
  const rawTasks    = useProjectTasks(user?.id ?? '', projectId)
  const rawArchive  = useProjectArchive(user?.id ?? '', projectId)
  const rawMeetings = useProjectMeetings(user?.id ?? '', projectId)

  const tasks    = rawTasks    ?? []
  const archive  = rawArchive  ?? []
  const meetings = rawMeetings ?? []

  const [tab, setTab] = useState<Tab>('tasks')

  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const progress  = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0

  // Loading state: undefined = still querying Dexie
  if (project === undefined) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
        Đang tải...
      </div>
    )
  }

  // null = not found in Dexie (might not be synced yet)
  if (project === null) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="text-4xl mb-4">⬡</div>
        <div className="text-neutral-600 text-sm font-medium mb-1">Không tìm thấy dự án</div>
        <div className="text-neutral-400 text-xs mb-6">
          Dự án chưa được đồng bộ hoặc không tồn tại
        </div>
        <Link
          href="/projects"
          className="text-sm text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
        >
          ← Quay lại danh sách
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Project header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/projects" className="text-neutral-400 hover:text-neutral-700 transition-colors text-lg leading-none">
            ←
          </Link>
          <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: project.color }} />
          <h1 className="text-2xl font-medium text-neutral-900">{project.name}</h1>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            project.status === 'active'  ? 'bg-emerald-50 text-emerald-600' :
            project.status === 'paused' ? 'bg-amber-50 text-amber-600' :
            'bg-neutral-100 text-neutral-500'
          }`}>
            {project.status === 'active' ? 'Đang chạy' : project.status === 'paused' ? 'Tạm dừng' : 'Xong'}
          </span>
        </div>

        {project.description && (
          <div className="text-sm text-neutral-500 ml-10 mb-2">{project.description}</div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-3 ml-10">
          <span className="text-sm text-neutral-500">{doneTasks.length}/{tasks.length} task</span>
          <div className="w-40 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: project.color }}
            />
          </div>
          <span className="text-xs text-neutral-400">{progress}%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          {([
            { id: 'tasks',    label: `✓ Công việc (${tasks.length})`      },
            { id: 'archive',  label: `◧ Lưu trữ (${archive.length})`     },
            { id: 'meetings', label: `◫ Lịch hẹn (${meetings.length})`   },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => openQuickAdd(tab === 'tasks' ? 'task' : tab === 'archive' ? 'archive' : 'meeting')}
          className="flex items-center gap-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          + Thêm
        </button>
      </div>

      {/* Tab content */}
      {tab === 'tasks' && (
        <TaskKanban
          todoTasks={todoTasks}
          doneTasks={doneTasks}
          userId={user?.id ?? ''}
          projectId={projectId}
        />
      )}
      {tab === 'archive' && (
        <ArchiveSection archive={archive} onAdd={() => openQuickAdd('archive')} />
      )}
      {tab === 'meetings' && (
        <MeetingsSection meetings={meetings} onAdd={() => openQuickAdd('meeting')} />
      )}
    </div>
  )
}

// ── Task Kanban ───────────────────────────────────────────────────
function TaskKanban({
  todoTasks,
  doneTasks,
  userId,
  projectId,
}: {
  todoTasks: Task[]
  doneTasks: Task[]
  userId: string
  projectId: string
}) {
  const [adding, setAdding]       = useState(false)
  const [newTitle, setNewTitle]   = useState('')
  const inputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  async function handleAdd() {
    const t = newTitle.trim()
    if (!t) { setAdding(false); return }
    await addProjectTask(userId, projectId, t)
    setNewTitle('')
    // keep form open for rapid entry
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Todo column */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-neutral-400" />
          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Cần làm
          </span>
          <span className="text-xs text-neutral-400">{todoTasks.length}</span>
        </div>

        <div className="flex flex-col gap-2 min-h-[80px]">
          {todoTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onAction={() => moveTask(task.id, 'done')}
            />
          ))}
        </div>

        {adding ? (
          <div className="mt-2">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
              }}
              onBlur={() => { if (!newTitle.trim()) setAdding(false) }}
              placeholder="Tên task... (Enter để lưu)"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:border-neutral-500 transition-colors"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 w-full text-left text-xs text-neutral-400 hover:text-neutral-600 px-2 py-1.5 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            + Thêm task
          </button>
        )}
      </div>

      {/* Done column */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Hoàn thành
          </span>
          <span className="text-xs text-neutral-400">{doneTasks.length}</span>
        </div>

        <div className="flex flex-col gap-2 min-h-[80px]">
          {doneTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              done
              onAction={() => moveTask(task.id, 'todo')}
            />
          ))}
          {doneTasks.length === 0 && (
            <div className="border-2 border-dashed border-neutral-100 rounded-lg h-16 flex items-center justify-center">
              <span className="text-xs text-neutral-300">Chưa có task nào xong</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  done,
  onAction,
}: {
  task: Task
  done?: boolean
  onAction: () => void
}) {
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-lg p-3 group hover:shadow-sm transition-all ${
        done ? 'opacity-55' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={onAction}
          title={done ? 'Hoàn tác' : 'Đánh dấu xong'}
          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
            done
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-neutral-300 hover:border-emerald-400'
          }`}
        >
          {done && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm text-neutral-900 leading-snug ${done ? 'line-through text-neutral-400' : ''}`}>
            {task.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {task.priority && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                task.priority === 'high' ? 'bg-red-50 text-red-600'
                : task.priority === 'mid' ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
              }`}>
                {task.priority === 'high' ? 'Cao' : task.priority === 'mid' ? 'TB' : 'Thấp'}
              </span>
            )}
            {task.scheduled_date && (
              <span className="text-[10px] text-neutral-400">
                {format(new Date(task.scheduled_date + 'T12:00:00'), 'd/M', { locale: vi })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Archive section ───────────────────────────────────────────────
function ArchiveSection({
  archive,
  onAdd,
}: {
  archive: ArchiveItem[]
  onAdd: () => void
}) {
  if (archive.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 select-none">◧</div>
        <div className="text-neutral-500 text-sm mb-1">Chưa có tài liệu nào</div>
        <div className="text-neutral-400 text-xs mb-5">
          Lưu link, ảnh, bài viết liên quan đến dự án này
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:opacity-85 transition-opacity"
        >
          Thêm tài liệu
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {archive.map((item) => (
        <ArchiveCard key={item.id} item={item} onDelete={deleteArchiveItem} />
      ))}
    </div>
  )
}

// ── Meetings section ──────────────────────────────────────────────
const MODE_LABEL: Record<string, string> = {
  offline: 'Trực tiếp',
  online:  'Online',
  phone:   'Điện thoại',
}
const MODE_COLOR: Record<string, string> = {
  offline: 'bg-blue-50 text-blue-600',
  online:  'bg-purple-50 text-purple-600',
  phone:   'bg-emerald-50 text-emerald-600',
}

function MeetingsSection({
  meetings,
  onAdd,
}: {
  meetings: Meeting[]
  onAdd: () => void
}) {
  if (meetings.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 select-none">◫</div>
        <div className="text-neutral-500 text-sm mb-1">Chưa có lịch hẹn nào</div>
        <div className="text-neutral-400 text-xs mb-5">
          Lưu lại các buổi gặp khách hàng liên quan đến dự án này
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:opacity-85 transition-opacity"
        >
          Thêm lịch hẹn
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {meetings.map((m) => (
        <MeetingRow key={m.id} meeting={m} />
      ))}
    </div>
  )
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const dt = new Date(meeting.scheduled_at)
  const isPast = dt < new Date()

  return (
    <div className={`bg-white border border-neutral-200 rounded-xl p-4 flex gap-4 ${isPast ? 'opacity-60' : ''}`}>
      {/* Date block */}
      <div className="text-center shrink-0 w-12">
        <div className="text-lg font-semibold text-neutral-900 leading-none">
          {format(dt, 'd')}
        </div>
        <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
          {format(dt, 'MMM', { locale: vi })}
        </div>
        <div className="text-xs text-neutral-400 mt-0.5">
          {format(dt, 'HH:mm')}
        </div>
      </div>

      <div className="flex-1 min-w-0 border-l border-neutral-100 pl-4">
        <div className="text-sm font-medium text-neutral-900 mb-0.5 truncate">{meeting.title}</div>
        <div className="text-xs text-neutral-500 mb-2">{meeting.client_name}</div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${MODE_COLOR[meeting.mode]}`}>
            {MODE_LABEL[meeting.mode]}
          </span>
          {meeting.location && (
            <span className="text-[10px] text-neutral-400 truncate max-w-[200px]">
              {meeting.location}
            </span>
          )}
        </div>
        {meeting.agenda && (
          <div className="text-xs text-neutral-400 mt-1.5 line-clamp-2">{meeting.agenda}</div>
        )}
      </div>
    </div>
  )
}
