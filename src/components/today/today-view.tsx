'use client'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useTodayTasks, toggleTask, postponeTask, deleteTask, updateTask } from '@/hooks/use-today-tasks'
import { useTodayMeetings, deleteMeeting, updateMeeting } from '@/hooks/use-calendar'
import { useUIStore } from '@/store'
import { useAuth } from '@/lib/auth-context'
import { useProjects } from '@/hooks/use-projects'
import { WeeklyInsightPanel } from '@/components/ai/weekly-insight-panel'
import { PatternAlertModal } from '@/components/ai/pattern-alert-modal'
import type { Task, Meeting, Project, TaskPriority, MeetingMode } from '@/types'

const SLOTS = ['morning', 'afternoon', 'evening'] as const
type SlotKey = typeof SLOTS[number]

const SLOT_LABEL: Record<SlotKey, string> = {
  morning: 'Buổi sáng',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
}

function getMeetingSlot(scheduledAt: string): SlotKey {
  const hour = new Date(scheduledAt).getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

type SlotItem =
  | { kind: 'task'; data: Task; sortKey: string }
  | { kind: 'meeting'; data: Meeting; sortKey: string }

// ── Main view ────────────────────────────────────────────────────

export function TodayView() {
  const { user } = useAuth()
  const { tasks, done, total, selectedDate } = useTodayTasks(user?.id ?? '')
  const meetings = useTodayMeetings(user?.id ?? '', selectedDate) ?? []
  const openQuickAdd = useUIStore((s) => s.openQuickAdd)
  const { data: projects = [] } = useProjects(user?.id ?? '')

  const [insightOpen, setInsightOpen] = useState(false)
  const [alertTask, setAlertTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)

  const projectMap = useMemo(
    () => new Map(projects.map((p: Project) => [p.id, p])),
    [projects]
  )

  const slotItems = useMemo((): Record<SlotKey, SlotItem[]> => {
    const acc: Record<SlotKey, SlotItem[]> = { morning: [], afternoon: [], evening: [] }

    for (const task of tasks) {
      const ts = task.time_slot as SlotKey | undefined
      const slot: SlotKey = ts && ts in acc ? ts : 'morning'
      acc[slot].push({ kind: 'task', data: task, sortKey: task.scheduled_time ?? '99:99' })
    }

    for (const m of meetings) {
      const slot = getMeetingSlot(m.scheduled_at)
      acc[slot].push({ kind: 'meeting', data: m, sortKey: format(new Date(m.scheduled_at), 'HH:mm') })
    }

    for (const slot of SLOTS) {
      acc[slot].sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    }
    return acc
  }, [tasks, meetings])

  const handlePostpone = async (task: Task) => {
    const updated = await postponeTask(task)
    if ((updated.postpone_count ?? 0) >= 3) setAlertTask(updated)
  }

  const isEmpty = total === 0 && meetings.length === 0
  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const dateLabel = format(new Date(selectedDate + 'T12:00:00'), "EEEE, d 'tháng' M", { locale: vi })

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-sm text-neutral-400 mb-0.5 capitalize">{dateLabel}</div>
          <h1 className="text-2xl font-medium text-neutral-900">Hôm nay</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span>{done}/{total}</span>
            <div className="w-20 h-1 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <button
            onClick={() => setInsightOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-violet-200 text-violet-600 rounded-lg text-sm hover:bg-violet-50 transition-colors"
          >
            ✦ Insight
          </button>
          <button
            onClick={() => openQuickAdd('task')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            + Thêm task
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">☀</div>
          <div className="text-neutral-500 text-sm mb-4">Chưa có task hay lịch hẹn nào hôm nay</div>
          <button
            onClick={() => openQuickAdd('task')}
            className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:opacity-85"
          >
            Thêm task đầu tiên
          </button>
        </div>
      ) : (
        <>
          {SLOTS.map((slot) => (
            <div key={slot} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  {SLOT_LABEL[slot]}
                </span>
                <div className="flex-1 h-px bg-neutral-100" />
              </div>

              {slotItems[slot].length > 0 && (
                <div className="flex flex-col gap-0.5 mb-1">
                  {slotItems[slot].map((item) =>
                    item.kind === 'task' ? (
                      <TaskRow
                        key={item.data.id}
                        task={item.data}
                        project={item.data.project_id ? projectMap.get(item.data.project_id) : undefined}
                        onPostpone={handlePostpone}
                        onEdit={() => setEditingTask(item.data)}
                        onDelete={() => deleteTask(item.data.id)}
                      />
                    ) : (
                      <MeetingRow
                        key={item.data.id}
                        meeting={item.data}
                        project={item.data.project_id ? projectMap.get(item.data.project_id) : undefined}
                        onEdit={() => setEditingMeeting(item.data)}
                        onDelete={() => deleteMeeting(item.data.id)}
                      />
                    )
                  )}
                </div>
              )}

              <button
                onClick={() => openQuickAdd('task')}
                className="text-xs text-neutral-300 hover:text-neutral-500 px-2 py-1 transition-colors"
              >
                + Thêm task {SLOT_LABEL[slot].toLowerCase()}...
              </button>
            </div>
          ))}
        </>
      )}

      {insightOpen && <WeeklyInsightPanel onClose={() => setInsightOpen(false)} />}
      {alertTask && <PatternAlertModal task={alertTask} onClose={() => setAlertTask(null)} />}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          userId={user?.id ?? ''}
          projects={projects}
          onClose={() => setEditingTask(null)}
        />
      )}
      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          userId={user?.id ?? ''}
          projects={projects}
          onClose={() => setEditingMeeting(null)}
        />
      )}
    </div>
  )
}

// ── TaskRow ──────────────────────────────────────────────────────

function TaskRow({
  task,
  project,
  onPostpone,
  onEdit,
  onDelete,
}: {
  task: Task
  project?: Project
  onPostpone: (task: Task) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isDone = task.status === 'done'

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group hover:bg-neutral-50 transition-colors ${isDone ? 'opacity-60' : ''}`}
    >
      <button
        onClick={() => toggleTask(task.id, task.status, task.user_id)}
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          isDone
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-neutral-300 hover:border-neutral-500'
        }`}
        aria-label={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span className={`flex-1 text-sm min-w-0 truncate ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
        {task.title}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ProjectBadge project={project} />
        {task.priority && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            task.priority === 'high' ? 'bg-red-50 text-red-600'
            : task.priority === 'mid' ? 'bg-amber-50 text-amber-600'
            : 'bg-emerald-50 text-emerald-600'
          }`}>
            {task.priority === 'high' ? 'Cao' : task.priority === 'mid' ? 'Trung bình' : 'Thấp'}
          </span>
        )}
        {(task.postpone_count ?? 0) > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-500 font-medium">
            Hoãn {task.postpone_count}x
          </span>
        )}
        {task.scheduled_time && (
          <span className="text-[11px] text-neutral-400 tabular-nums">{task.scheduled_time}</span>
        )}
      </div>

      {/* Hover actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
        {!isDone && (
          <button
            onClick={() => onPostpone(task)}
            className="px-2 py-1 text-[10px] text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
            title="Để mai"
          >
            Để mai
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-1.5 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
          title="Chỉnh sửa"
        >
          <IconEdit />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Xóa"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

// ── MeetingRow ───────────────────────────────────────────────────

function MeetingRow({
  meeting,
  project,
  onEdit,
  onDelete,
}: {
  meeting: Meeting
  project?: Project
  onEdit: () => void
  onDelete: () => void
}) {
  const time = format(new Date(meeting.scheduled_at), 'HH:mm')

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg group hover:bg-blue-50/40 transition-colors">
      <div className="w-4 h-4 rounded border border-blue-200 bg-blue-50 flex items-center justify-center shrink-0 text-[9px] text-blue-500 font-bold leading-none">
        ◫
      </div>

      <span className="flex-1 text-sm text-neutral-900 min-w-0 truncate">{meeting.title}</span>

      {/* Badges + time */}
      <div className="flex items-center gap-1.5 shrink-0">
        <ProjectBadge project={project} />
        <span className="text-[11px] text-neutral-400 tabular-nums">◎ {time}</span>
      </div>

      {/* Hover actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
        <button
          onClick={onEdit}
          className="p-1.5 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
          title="Chỉnh sửa"
        >
          <IconEdit />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Xóa"
        >
          <IconTrash />
        </button>
      </div>
    </div>
  )
}

// ── Shared badge ─────────────────────────────────────────────────

function ProjectBadge({ project }: { project?: Project }) {
  if (project) {
    return (
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white leading-none"
        style={{ backgroundColor: project.color || '#6b7280' }}
      >
        {project.name}
      </span>
    )
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-neutral-100 text-neutral-500 leading-none">
      Cá nhân
    </span>
  )
}

// ── Edit Task Modal ───────────────────────────────────────────────

function EditTaskModal({
  task,
  userId,
  projects,
  onClose,
}: {
  task: Task
  userId: string
  projects: Project[]
  onClose: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [slot, setSlot] = useState<string>(task.time_slot ?? 'morning')
  const [priority, setPriority] = useState<string>(task.priority ?? '')
  const [note, setNote] = useState(task.note ?? '')
  const [projectId, setProjectId] = useState(task.project_id ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    await updateTask(task.id, {
      title: title.trim(),
      time_slot: slot as Task['time_slot'],
      priority: (priority || undefined) as TaskPriority | undefined,
      note: note.trim() || undefined,
      project_id: projectId || undefined,
    }, userId)
    setSaving(false)
    onClose()
  }

  return (
    <ModalShell onClose={onClose} title="Chỉnh sửa task">
      <div className="px-5 py-4 flex flex-col gap-4">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          className="w-full text-sm font-medium text-neutral-900 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-neutral-400 transition-colors"
          placeholder="Tên task..."
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-20 shrink-0">Buổi</span>
          <div className="flex gap-1.5">
            {SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlot(s)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  slot === s
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {SLOT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-20 shrink-0">Ưu tiên</span>
          <div className="flex gap-1.5">
            {[{ v: '', l: 'Không' }, { v: 'high', l: 'Cao' }, { v: 'mid', l: 'Trung bình' }, { v: 'low', l: 'Thấp' }].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setPriority(v)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  priority === v
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-20 shrink-0">Dự án</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setProjectId('')}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                !projectId ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-500'
              }`}
            >
              Cá nhân
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors flex items-center gap-1 ${
                  projectId === p.id ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-500'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full text-sm text-neutral-700 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-neutral-400 transition-colors"
          placeholder="Ghi chú (tùy chọn)..."
        />
      </div>
      <ModalFooter onClose={onClose} onSave={save} saving={saving} />
    </ModalShell>
  )
}

// ── Edit Meeting Modal ────────────────────────────────────────────

const MODE_OPTIONS: { v: MeetingMode; l: string }[] = [
  { v: 'offline', l: 'Trực tiếp' },
  { v: 'online', l: 'Online' },
  { v: 'phone', l: 'Điện thoại' },
]

function EditMeetingModal({
  meeting,
  userId,
  projects,
  onClose,
}: {
  meeting: Meeting
  userId: string
  projects: Project[]
  onClose: () => void
}) {
  const [title, setTitle] = useState(meeting.title)
  const [clientName, setClientName] = useState(meeting.client_name)
  const [mode, setMode] = useState<MeetingMode>(meeting.mode)
  const [projectId, setProjectId] = useState(meeting.project_id ?? '')
  // datetime-local format: YYYY-MM-DDTHH:mm
  const [scheduledAt, setScheduledAt] = useState(
    new Date(meeting.scheduled_at).toISOString().slice(0, 16)
  )
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim() || !clientName.trim()) return
    setSaving(true)
    await updateMeeting(meeting.id, {
      title: title.trim(),
      client_name: clientName.trim(),
      mode,
      scheduled_at: new Date(scheduledAt).toISOString(),
      project_id: projectId || undefined,
    }, userId)
    setSaving(false)
    onClose()
  }

  return (
    <ModalShell onClose={onClose} title="Chỉnh sửa lịch hẹn">
      <div className="px-5 py-4 flex flex-col gap-4">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-sm font-medium text-neutral-900 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-neutral-400 transition-colors"
          placeholder="Tiêu đề lịch hẹn..."
        />

        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full text-sm text-neutral-700 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-neutral-400 transition-colors"
          placeholder="Tên khách hàng..."
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-20 shrink-0">Thời gian</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-1.5 outline-none focus:border-neutral-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-20 shrink-0">Hình thức</span>
          <div className="flex gap-1.5">
            {MODE_OPTIONS.map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => setMode(v)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  mode === v
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-20 shrink-0">Dự án</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setProjectId('')}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                !projectId ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-500'
              }`}
            >
              Cá nhân
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProjectId(p.id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors flex items-center gap-1 ${
                  projectId === p.id ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-500'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ModalFooter onClose={onClose} onSave={save} saving={saving} />
    </ModalShell>
  )
}

// ── Shared modal primitives ───────────────────────────────────────

function ModalShell({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-0">
            <span className="text-sm font-medium text-neutral-900">{title}</span>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 text-sm"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

function ModalFooter({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 text-sm text-neutral-500 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
      >
        Huỷ
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-4 py-1.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:opacity-85 disabled:opacity-40 transition-opacity"
      >
        {saving ? 'Đang lưu...' : 'Lưu'}
      </button>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M10 2L12 4L5 11H3V9L10 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 4H12M5 4V2.5H9V4M5.5 7V10.5M8.5 7V10.5M3 4L3.5 12H10.5L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
