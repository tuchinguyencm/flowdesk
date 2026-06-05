'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { pushUnsyncedData } from '@/lib/sync'
import { useTaskStore } from '@/store'
import type { Task, TaskStatus } from '@/types'
import { v4 as uuid } from 'uuid'

const TIME_ORDER: Record<string, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
}

export function useTodayTasks(userId: string) {
  const selectedDate = useTaskStore((s) => s.selectedDate)

  const tasks = useLiveQuery(
    () =>
      db.tasks
        .where('scheduled_date')
        .equals(selectedDate)
        .and((t) => t.user_id === userId && t.status !== 'cancelled')
        .toArray(),
    [selectedDate, userId]
  )

  const sorted = (tasks ?? []).sort((a, b) => {
    const ao = TIME_ORDER[a.time_slot ?? ''] ?? 99
    const bo = TIME_ORDER[b.time_slot ?? ''] ?? 99
    return ao - bo
  })

  const done = sorted.filter((t) => t.status === 'done').length
  const total = sorted.length

  return { tasks: sorted, done, total, selectedDate }
}

export async function addTask(input: Omit<Task, 'id' | 'created_at' | '_synced'>) {
  const task: Task = {
    ...input,
    id: uuid(),
    created_at: new Date().toISOString(),
    _synced: false,
  }
  await db.tasks.add(task)
  pushUnsyncedData(task.user_id).catch(() => {})
  return task
}

export async function toggleTask(id: string, currentStatus: TaskStatus, userId: string) {
  const next = currentStatus === 'done' ? 'todo' : 'done'
  await db.tasks.update(id, {
    status: next,
    completed_at: next === 'done' ? new Date().toISOString() : undefined,
    _synced: false,
  })
  pushUnsyncedData(userId).catch(() => {})
}

export async function deleteTask(id: string) {
  await db.tasks.delete(id)
}

export async function postponeTask(task: Task): Promise<Task> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const newCount = (task.postpone_count ?? 0) + 1

  await db.tasks.update(task.id, {
    scheduled_date: tomorrowStr,
    postpone_count: newCount,
    _synced: false,
  })
  pushUnsyncedData(task.user_id).catch(() => {})

  return { ...task, scheduled_date: tomorrowStr, postpone_count: newCount }
}
