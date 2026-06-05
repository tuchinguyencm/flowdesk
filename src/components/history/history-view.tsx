'use client'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'
import { useProjects } from '@/hooks/use-projects'
import { useAllTasks, useAllMeetings } from '@/hooks/use-calendar'
import type { Task, Meeting } from '@/types'

type ViewMode = 'date' | 'project'

const TIME_LABEL: Record<string, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  evening: 'Tối',
}

const MODE_LABEL: Record<string, string> = {
  offline: 'Gặp trực tiếp',
  online:  'Online',
  phone:   'Điện thoại',
}

// ── HistoryView ───────────────────────────────────────────────────
export function HistoryView() {
  const { user }  = useAuth()
  const [mode, setMode] = useState<ViewMode>('date')

  const rawTasks    = useAllTasks(user?.id ?? '')
  const rawMeetings = useAllMeetings(user?.id ?? '')
  const { data: projects = [] } = useProjects(user?.id ?? '')

  const tasks    = rawTasks    ?? []
  const meetings = rawMeetings ?? []

  const projectMap = useMemo(() => {
    const m: Record<string, { name: string; color: string }> = {}
    for (const p of projects) m[p.id] = { name: p.name, color: p.color }
    return m
  }, [projects])

  // Group by local date — reverse chronological
  const byDate = useMemo(() => {
    const map: Record<string, { tasks: Task[]; meetings: Meeting[] }> = {}
    for (const t of tasks) {
      const d = t.scheduled_date ?? t.created_at.split('T')[0]
      ;(map[d] ??= { tasks: [], meetings: [] }).tasks.push(t)
    }
    for (const m of meetings) {
      const d = new Date(m.scheduled_at).toLocaleDateString('sv-SE')
      ;(map[d] ??= { tasks: [], meetings: [] }).meetings.push(m)
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, ...items }))
  }, [tasks, meetings])

  // Group by project
  const byProject = useMemo(() => {
    const PERSONAL = '__personal__'
    const map: Record<string, { tasks: Task[]; meetings: Meeting[] }> = {}
    for (const t of tasks) {
      const key = t.project_id || PERSONAL
      ;(map[key] ??= { tasks: [], meetings: [] }).tasks.push(t)
    }
    for (const m of meetings) {
      const key = m.project_id || PERSONAL
      ;(map[key] ??= { tasks: [], meetings: [] }).meetings.push(m)
    }
    return Object.entries(map)
      .sort(([a], [b]) => {
        if (a === PERSONAL) return 1
        if (b === PERSONAL) return -1
        return (projectMap[a]?.name ?? '').localeCompare(projectMap[b]?.name ?? '')
      })
      .map(([key, items]) => ({
        projectId: key === PERSONAL ? undefined : key,
        name:  key === PERSONAL ? 'Cá nhân' : (projectMap[key]?.name ?? 'Không rõ'),
        color: key === PERSONAL ? '#94a3b8' : (projectMap[key]?.color ?? '#94a3b8'),
        ...items,
      }))
  }, [tasks, meetings, projectMap])

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Nhật ký</h1>
          <div className="text-sm text-neutral-400 mt-0.5">
            {tasks.length} task · {meetings.length} lịch hẹn
          </div>
        </div>
        <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
          <button
            onClick={() => setMode('date')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'date' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Theo ngày
          </button>
          <button
            onClick={() => setMode('project')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'project' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Theo dự án
          </button>
        </div>
      </div>

      {tasks.length === 0 && meetings.length === 0 ? (
        <div className="text-center py-20 text-neutral-400 text-sm">Chưa có dữ liệu nào</div>
      ) : mode === 'date' ? (
        <DateView groups={byDate} projectMap={projectMap} />
      ) : (
        <ProjectView groups={byProject} />
      )}
    </div>
  )
}

// ── Date view ─────────────────────────────────────────────────────
function DateView({
  groups,
  projectMap,
}: {
  groups: { date: string; tasks: Task[]; meetings: Meeting[] }[]
  projectMap: Record<string, { name: string; color: string }>
}) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ date, tasks, meetings }) => {
        const dateObj = new Date(date + 'T12:00:00')
        const label   = format(dateObj, "EEEE, d 'tháng' M yyyy", { locale: vi })

        // Group tasks by time slot
        const grouped = tasks.reduce<Record<string, Task[]>>((acc, t) => {
          const slot = t.time_slot ?? 'morning'
          ;(acc[slot] ??= []).push(t)
          return acc
        }, {})

        const sortedMeetings = [...meetings].sort((a, b) =>
          a.scheduled_at.localeCompare(b.scheduled_at)
        )

        return (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xs font-semibold text-neutral-500 capitalize whitespace-nowrap">{label}</div>
              <div className="flex-1 h-px bg-neutral-100" />
              <div className="text-[10px] text-neutral-300 whitespace-nowrap">
                {tasks.length > 0 && `${tasks.filter(t => t.status === 'done').length}/${tasks.length} task`}
                {tasks.length > 0 && meetings.length > 0 && ' · '}
                {meetings.length > 0 && `${meetings.length} lịch hẹn`}
              </div>
            </div>

            {/* Tasks by slot */}
            {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
              const slotTasks = grouped[slot]
              if (!slotTasks?.length) return null
              return (
                <div key={slot} className="mb-3">
                  <div className="text-[10px] font-medium text-neutral-300 uppercase tracking-wider px-3 mb-1">
                    {TIME_LABEL[slot]}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {slotTasks.map((t) => (
                      <TaskItem key={t.id} task={t} projectMap={projectMap} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Meetings */}
            {sortedMeetings.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-medium text-neutral-300 uppercase tracking-wider px-3 mb-1">
                  Lịch hẹn
                </div>
                <div className="flex flex-col gap-0.5">
                  {sortedMeetings.map((m) => (
                    <MeetingItem key={m.id} meeting={m} projectMap={projectMap} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Project view ──────────────────────────────────────────────────
function ProjectView({
  groups,
}: {
  groups: { projectId?: string; name: string; color: string; tasks: Task[]; meetings: Meeting[] }[]
}) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ projectId, name, color, tasks, meetings }) => {
        const sortedMeetings = [...meetings].sort((a, b) =>
          a.scheduled_at.localeCompare(b.scheduled_at)
        )
        const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
          const d = t.scheduled_date ?? t.created_at.split('T')[0]
          ;(acc[d] ??= []).push(t)
          return acc
        }, {})
        const sortedDates = Object.keys(tasksByDate).sort((a, b) => b.localeCompare(a))

        return (
          <div key={projectId ?? '__personal__'}>
            {/* Project header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs font-semibold text-neutral-600">{name}</span>
              </div>
              <div className="flex-1 h-px bg-neutral-100" />
              <div className="text-[10px] text-neutral-300 whitespace-nowrap">
                {tasks.length > 0 && `${tasks.filter(t => t.status === 'done').length}/${tasks.length} task`}
                {tasks.length > 0 && meetings.length > 0 && ' · '}
                {meetings.length > 0 && `${meetings.length} lịch hẹn`}
              </div>
            </div>

            {/* Tasks by date */}
            {sortedDates.map((date) => {
              const dateObj = new Date(date + 'T12:00:00')
              const label   = format(dateObj, "d 'tháng' M", { locale: vi })
              return (
                <div key={date} className="mb-3">
                  <div className="text-[10px] font-medium text-neutral-300 uppercase tracking-wider px-3 mb-1">
                    {label}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {tasksByDate[date].map((t) => (
                      <TaskItem key={t.id} task={t} projectMap={{}} showDate={false} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Meetings */}
            {sortedMeetings.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-medium text-neutral-300 uppercase tracking-wider px-3 mb-1">
                  Lịch hẹn
                </div>
                <div className="flex flex-col gap-0.5">
                  {sortedMeetings.map((m) => (
                    <MeetingItem key={m.id} meeting={m} projectMap={{}} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Shared item rows ──────────────────────────────────────────────
function TaskItem({
  task,
  projectMap,
  showDate = false,
}: {
  task: Task
  projectMap: Record<string, { name: string; color: string }>
  showDate?: boolean
}) {
  const isDone = task.status === 'done'
  const proj   = task.project_id ? projectMap[task.project_id] : null

  return (
    <div className={`flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors ${isDone ? 'opacity-60' : ''}`}>
      <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
        isDone ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-300'
      }`}>
        {isDone && (
          <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm text-neutral-800 ${isDone ? 'line-through' : ''}`}>{task.title}</span>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {showDate && task.scheduled_date && (
            <span className="text-[10px] text-neutral-400">
              {format(new Date(task.scheduled_date + 'T12:00:00'), "d/M", { locale: vi })}
            </span>
          )}
          {task.time_slot && (
            <span className="text-[10px] text-neutral-300">{TIME_LABEL[task.time_slot]}</span>
          )}
          {proj && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: proj.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: proj.color }} />
              {proj.name}
            </span>
          )}
          {task.priority === 'high' && (
            <span className="text-[10px] text-red-400">Cao</span>
          )}
        </div>
      </div>
    </div>
  )
}

function MeetingItem({
  meeting,
  projectMap,
}: {
  meeting: Meeting
  projectMap: Record<string, { name: string; color: string }>
}) {
  const proj = meeting.project_id ? projectMap[meeting.project_id] : null
  const time = format(new Date(meeting.scheduled_at), 'HH:mm')
  const date = format(new Date(meeting.scheduled_at), "d/M", { locale: vi })

  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-blue-50/40 transition-colors">
      <div className="mt-0.5 w-3.5 h-3.5 rounded border border-blue-200 bg-blue-50 flex items-center justify-center shrink-0 text-[7px] text-blue-400 font-bold">
        ◫
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-neutral-800">{meeting.title}</span>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] text-neutral-400">{date} {time}</span>
          <span className="text-[10px] text-neutral-400">{meeting.client_name}</span>
          {meeting.mode && (
            <span className="text-[10px] text-neutral-300">{MODE_LABEL[meeting.mode] ?? meeting.mode}</span>
          )}
          {proj && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: proj.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: proj.color }} />
              {proj.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
