'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { TaskStatus } from '@/types'
import { v4 as uuid } from 'uuid'

export function useProject(projectId: string) {
  return useLiveQuery(() => db.projects.get(projectId), [projectId])
}

export function useProjectTasks(userId: string, projectId: string) {
  return useLiveQuery(
    () =>
      db.tasks
        .where('project_id')
        .equals(projectId)
        .filter((t) => t.user_id === userId && t.status !== 'cancelled')
        .toArray()
        .then((tasks) => tasks.sort((a, b) => b.created_at.localeCompare(a.created_at))),
    [userId, projectId]
  )
}

export function useProjectArchive(userId: string, projectId: string) {
  return useLiveQuery(
    () =>
      db.archive_items
        .where('project_id')
        .equals(projectId)
        .filter((i) => i.user_id === userId)
        .toArray()
        .then((items) => items.sort((a, b) => b.created_at.localeCompare(a.created_at))),
    [userId, projectId]
  )
}

export function useProjectMeetings(userId: string, projectId: string) {
  return useLiveQuery(
    () =>
      db.meetings
        .where('project_id')
        .equals(projectId)
        .filter((m) => m.user_id === userId)
        .toArray()
        .then((meetings) =>
          meetings.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))
        ),
    [userId, projectId]
  )
}

export async function moveTask(id: string, status: TaskStatus) {
  await db.tasks.update(id, {
    status,
    completed_at: status === 'done' ? new Date().toISOString() : undefined,
    _synced: false,
  })
}

export async function addProjectTask(userId: string, projectId: string, title: string) {
  await db.tasks.add({
    id: uuid(),
    user_id: userId,
    project_id: projectId,
    title,
    status: 'todo',
    scheduled_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    _synced: false,
  })
}
