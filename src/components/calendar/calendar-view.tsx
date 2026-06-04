'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { useAuth } from '@/lib/auth-context'
import { useTaskStore } from '@/store'
import { useProjects } from '@/hooks/use-projects'
import { useMonthTasks, useMonthMeetings } from '@/hooks/use-calendar'
import type { Task, Meeting } from '@/types'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

// ── Helpers ───────────────────────────────────────────────────────
function buildCalendarGrid(viewDate: Date) {
  const first = startOfMonth(viewDate)
  const last  = endOfMonth(viewDate)
  const days  = eachDayOfInterval({ start: first, end: last })

  // Monday-first: Sun = 0 → padding 6, Mon = 1 → padding 0, …
  const dow = getDay(first)
  const paddingBefore = dow === 0 ? 6 : dow - 1

  const grid: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = paddingBefore; i > 0; i--) {
    const d = new Date(first)
    d.setDate(d.getDate() - i)
    grid.push({ date: d, isCurrentMonth: false })
  }
  days.forEach((d) => grid.push({ date: d, isCurrentMonth: true }))

  const trailing = grid.length % 7 === 0 ? 0 : 7 - (grid.length % 7)
  for (let i = 1; i <= trailing; i++) {
    const d = new Date(last)
    d.setDate(d.getDate() + i)
    grid.push({ date: d, isCurrentMonth: false })
  }
  return grid
}

// ── CalendarView ──────────────────────────────────────────────────
export function CalendarView() {
  const { user }        = useAuth()
  const router          = useRouter()
  const setSelectedDate = useTaskStore((s) => s.setSelectedDate)
  const selectedDate    = useTaskStore((s) => s.selectedDate)

  const [viewDate, setViewDate] = useState(() => new Date())

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth() + 1

  const rawTasks    = useMonthTasks(user?.id ?? '', year, month)
  const rawMeetings = useMonthMeetings(user?.id ?? '', year, month)
  const { data: projects = [] } = useProjects(user?.id ?? '')

  const tasks    = rawTasks    ?? []
  const meetings = rawMeetings ?? []

  // index by date string
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (!t.scheduled_date) continue
      ;(map[t.scheduled_date] ??= []).push(t)
    }
    return map
  }, [tasks])

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {}
    for (const m of meetings) {
      const d = m.scheduled_at.split('T')[0]
      ;(map[d] ??= []).push(m)
    }
    return map
  }, [meetings])

  const projectColor = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of projects) map[p.id] = p.color
    return map
  }, [projects])

  const grid = useMemo(() => buildCalendarGrid(viewDate), [viewDate])

  function goToDay(date: Date) {
    const ds = format(date, 'yyyy-MM-dd')
    setSelectedDate(ds)
    router.push('/today')
  }

  const monthLabel = format(viewDate, "MMMM 'năm' yyyy", { locale: vi })

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-neutral-900 capitalize">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewDate(new Date())}
            className="px-3 py-1.5 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Hôm nay
          </button>
          <button
            onClick={() => setViewDate((d) => subMonths(d, 1))}
            className="w-8 h-8 flex items-center justify-center border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => setViewDate((d) => addMonths(d, 1))}
            className="w-8 h-8 flex items-center justify-center border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-px">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-t border-l border-neutral-200 rounded-b-xl overflow-hidden">
        {grid.map(({ date, isCurrentMonth }, i) => {
          const ds        = format(date, 'yyyy-MM-dd')
          const dayTasks  = tasksByDate[ds]  ?? []
          const dayMeets  = meetingsByDate[ds] ?? []
          const today     = isToday(date)
          const isSelected = ds === selectedDate
          const todoCount = dayTasks.filter((t) => t.status === 'todo').length
          const doneCount = dayTasks.filter((t) => t.status === 'done').length

          return (
            <DayCell
              key={i}
              date={date}
              isCurrentMonth={isCurrentMonth}
              today={today}
              isSelected={isSelected}
              tasks={dayTasks}
              meetings={dayMeets}
              todoCount={todoCount}
              doneCount={doneCount}
              projectColor={projectColor}
              onClick={() => goToDay(date)}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-neutral-200" />
          Cần làm
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-emerald-100" />
          Hoàn thành
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm bg-blue-100" />
          Lịch hẹn
        </div>
      </div>
    </div>
  )
}

// ── Day cell ──────────────────────────────────────────────────────
interface DayCellProps {
  date: Date
  isCurrentMonth: boolean
  today: boolean
  isSelected: boolean
  tasks: Task[]
  meetings: Meeting[]
  todoCount: number
  doneCount: number
  projectColor: Record<string, string>
  onClick: () => void
}

function DayCell({
  date,
  isCurrentMonth,
  today,
  isSelected,
  tasks,
  meetings,
  projectColor,
  onClick,
}: DayCellProps) {
  const MAX_ITEMS = 3
  const allItems: { label: string; color?: string; done?: boolean; isMeeting?: boolean }[] = []

  for (const t of tasks) {
    allItems.push({
      label:   t.title,
      color:   t.project_id ? projectColor[t.project_id] : undefined,
      done:    t.status === 'done',
    })
  }
  for (const m of meetings) {
    allItems.push({ label: m.title, isMeeting: true })
  }

  const visible  = allItems.slice(0, MAX_ITEMS)
  const overflow = allItems.length - MAX_ITEMS

  return (
    <div
      onClick={onClick}
      className={`
        min-h-[110px] border-r border-b border-neutral-200 p-1.5 cursor-pointer
        transition-colors select-none
        ${isCurrentMonth ? 'bg-white hover:bg-neutral-50' : 'bg-neutral-50/60 hover:bg-neutral-100/60'}
        ${isSelected ? 'ring-2 ring-inset ring-neutral-900' : ''}
      `}
    >
      {/* Day number */}
      <div className={`
        text-xs font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full leading-none
        ${today ? 'bg-neutral-900 text-white' : isCurrentMonth ? 'text-neutral-800' : 'text-neutral-300'}
      `}>
        {format(date, 'd')}
      </div>

      {/* Event pills */}
      <div className="flex flex-col gap-0.5">
        {visible.map((item, idx) => (
          <EventPill key={idx} item={item} projectColor={projectColor} />
        ))}
        {overflow > 0 && (
          <div className="text-[9px] text-neutral-400 px-1 leading-none mt-0.5">
            +{overflow} nữa
          </div>
        )}
      </div>
    </div>
  )
}

// ── Event pill ────────────────────────────────────────────────────
function EventPill({
  item,
}: {
  item: { label: string; color?: string; done?: boolean; isMeeting?: boolean }
  projectColor: Record<string, string>
}) {
  if (item.isMeeting) {
    return (
      <div className="text-[10px] px-1 py-0.5 rounded bg-blue-50 text-blue-700 truncate leading-tight">
        ◫ {item.label}
      </div>
    )
  }

  if (item.done) {
    return (
      <div className="text-[10px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 truncate leading-tight line-through opacity-70">
        {item.label}
      </div>
    )
  }

  // Todo — colored by project or neutral
  const style = item.color
    ? { background: item.color + '22', color: item.color }
    : undefined

  return (
    <div
      className={`text-[10px] px-1 py-0.5 rounded truncate leading-tight ${
        item.color ? '' : 'bg-neutral-100 text-neutral-700'
      }`}
      style={style}
    >
      {item.label}
    </div>
  )
}
