'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useTodayTasks, toggleTask, postponeTask } from '@/hooks/use-today-tasks'
import { useTodayMeetings } from '@/hooks/use-calendar'
import { useUIStore } from '@/store'
import { useAuth } from '@/lib/auth-context'
import { WeeklyInsightPanel } from '@/components/ai/weekly-insight-panel'
import { PatternAlertModal } from '@/components/ai/pattern-alert-modal'
import type { Task, Meeting } from '@/types'

const TIME_LABEL: Record<string, string> = {
  morning: 'Buổi sáng',
  afternoon: 'Buổi chiều',
  evening: 'Buổi tối',
}

const MODE_LABEL: Record<string, string> = {
  offline: 'Gặp trực tiếp',
  online:  'Online',
  phone:   'Điện thoại',
}

export function TodayView() {
  const { user } = useAuth()
  const { tasks, done, total, selectedDate } = useTodayTasks(user?.id ?? '')
  const meetings = useTodayMeetings(user?.id ?? '', selectedDate) ?? []
  const openQuickAdd = useUIStore((s) => s.openQuickAdd)
  const [insightOpen, setInsightOpen] = useState(false)
  const [alertTask, setAlertTask] = useState<Task | null>(null)

  const grouped = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const slot = task.time_slot ?? 'morning'
    if (!acc[slot]) acc[slot] = []
    acc[slot].push(task)
    return acc
  }, {})

  const sortedMeetings = [...meetings].sort((a, b) =>
    a.scheduled_at.localeCompare(b.scheduled_at)
  )

  const progress = total > 0 ? Math.round((done / total) * 100) : 0
  const dateLabel = format(new Date(selectedDate + 'T12:00:00'), "EEEE, d 'tháng' M", { locale: vi })

  const handlePostpone = async (task: Task) => {
    const updated = await postponeTask(task)
    if ((updated.postpone_count ?? 0) >= 3) {
      setAlertTask(updated)
    }
  }

  const isEmpty = total === 0 && meetings.length === 0

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
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
            title="Insight tuần này"
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
          {/* Tasks grouped by time slot */}
          {Object.entries(grouped).map(([slot, slotTasks]) => (
            <div key={slot} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  {TIME_LABEL[slot] ?? slot}
                </span>
                <div className="flex-1 h-px bg-neutral-100" />
              </div>
              <div className="flex flex-col gap-1">
                {slotTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onPostpone={handlePostpone} />
                ))}
              </div>
              <button
                onClick={() => openQuickAdd('task')}
                className="mt-2 text-xs text-neutral-300 hover:text-neutral-500 px-2 py-1 transition-colors"
              >
                + Thêm task {TIME_LABEL[slot]?.toLowerCase() ?? slot}...
              </button>
            </div>
          ))}

          {/* Meetings */}
          {sortedMeetings.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Lịch hẹn</span>
                <div className="flex-1 h-px bg-neutral-100" />
              </div>
              <div className="flex flex-col gap-1">
                {sortedMeetings.map((m) => (
                  <MeetingRow key={m.id} meeting={m} />
                ))}
              </div>
              <button
                onClick={() => openQuickAdd('meeting')}
                className="mt-2 text-xs text-neutral-300 hover:text-neutral-500 px-2 py-1 transition-colors"
              >
                + Thêm lịch hẹn...
              </button>
            </div>
          )}
        </>
      )}

      {insightOpen && <WeeklyInsightPanel onClose={() => setInsightOpen(false)} />}
      {alertTask && <PatternAlertModal task={alertTask} onClose={() => setAlertTask(null)} />}
    </div>
  )
}

function TaskRow({ task, onPostpone }: { task: Task; onPostpone: (task: Task) => void }) {
  const isDone = task.status === 'done'

  return (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg group hover:bg-neutral-50 transition-colors ${isDone ? 'opacity-50' : ''}`}>
      <button
        onClick={() => toggleTask(task.id, task.status, task.user_id)}
        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          isDone ? 'bg-emerald-500 border-emerald-500' : 'border-neutral-300 hover:border-neutral-500'
        }`}
        aria-label={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
      >
        {isDone && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm text-neutral-900 ${isDone ? 'line-through' : ''}`}>{task.title}</div>
        {task.note && (
          <div className="text-xs text-neutral-400 mt-0.5 truncate">{task.note}</div>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        {!isDone && (
          <button
            onClick={() => onPostpone(task)}
            className="px-2 py-1 text-[10px] text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
            title="Để mai"
          >
            Để mai
          </button>
        )}
        <button className="p-1 text-neutral-300 hover:text-neutral-500 rounded">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10 2L12 4L5 11H3V9L10 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
  const time = format(new Date(meeting.scheduled_at), 'HH:mm')
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50/50 transition-colors">
      <div className="mt-0.5 w-4 h-4 rounded border border-blue-200 bg-blue-50 flex items-center justify-center shrink-0 text-[8px] text-blue-500 font-bold">
        ◫
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-neutral-900">{meeting.title}</div>
        <div className="text-xs text-neutral-400 mt-0.5">
          {time} · {meeting.client_name}
          {meeting.mode && <span className="ml-1.5 text-neutral-300">· {MODE_LABEL[meeting.mode] ?? meeting.mode}</span>}
        </div>
      </div>
    </div>
  )
}
