'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { pushUnsyncedData } from '@/lib/sync'
import type { Meeting } from '@/types'

export function useTodayMeetings(userId: string, date: string) {
  return useLiveQuery(
    () =>
      db.meetings
        .where('user_id')
        .equals(userId)
        .filter((m) => new Date(m.scheduled_at).toLocaleDateString('sv-SE') === date)
        .toArray(),
    [userId, date]
  )
}

export function useAllTasks(userId: string) {
  return useLiveQuery(
    () =>
      db.tasks
        .where('user_id')
        .equals(userId)
        .filter((t) => t.status !== 'cancelled')
        .toArray(),
    [userId]
  )
}

export function useAllMeetings(userId: string) {
  return useLiveQuery(
    () => db.meetings.where('user_id').equals(userId).toArray(),
    [userId]
  )
}

export function useMonthTasks(userId: string, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end   = `${year}-${String(month).padStart(2, '0')}-31` // safe upper bound

  return useLiveQuery(
    () =>
      db.tasks
        .where('scheduled_date')
        .between(start, end, true, true)
        .filter((t) => t.user_id === userId && t.status !== 'cancelled')
        .toArray(),
    [userId, year, month]
  )
}

export async function deleteMeeting(id: string) {
  await db.meetings.delete(id)
}

export async function updateMeeting(id: string, updates: Partial<Meeting>, userId: string) {
  await db.meetings.update(id, { ...updates, _synced: false })
  pushUnsyncedData(userId).catch(() => {})
}

export function useMonthMeetings(userId: string, year: number, month: number) {
  const start    = `${year}-${String(month).padStart(2, '0')}-01`
  const nextM    = month === 12 ? 1 : month + 1
  const nextY    = month === 12 ? year + 1 : year
  const end      = `${nextY}-${String(nextM).padStart(2, '0')}-01`

  return useLiveQuery(
    () =>
      db.meetings
        .where('scheduled_at')
        .between(start, end, true, false)
        .filter((m) => m.user_id === userId)
        .toArray(),
    [userId, year, month]
  )
}
