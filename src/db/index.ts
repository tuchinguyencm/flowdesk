import Dexie, { type Table } from 'dexie'
import type { Task, ArchiveItem, Meeting, Project } from '@/types'

export class FlowDeskDB extends Dexie {
  tasks!: Table<Task>
  archive_items!: Table<ArchiveItem>
  meetings!: Table<Meeting>
  projects!: Table<Project>

  constructor() {
    super('flowdesk')

    this.version(1).stores({
      tasks:
        'id, user_id, project_id, status, scheduled_date, time_slot, created_at, _synced',
      archive_items:
        'id, user_id, project_id, type, *purpose, *tags, created_at, _synced',
      meetings:
        'id, user_id, project_id, scheduled_at, created_at, _synced',
      projects:
        'id, user_id, status, created_at',
    })
  }
}

export const db = new FlowDeskDB()

// Helpers

export async function getTodayTasks(userId: string, date: string) {
  return db.tasks
    .where('scheduled_date')
    .equals(date)
    .and((t) => t.user_id === userId)
    .sortBy('time_slot')
}

export async function getUnsyncedItems() {
  const [tasks, archive, meetings] = await Promise.all([
    db.tasks.where('_synced').equals(0).toArray(),
    db.archive_items.where('_synced').equals(0).toArray(),
    db.meetings.where('_synced').equals(0).toArray(),
  ])
  return { tasks, archive, meetings }
}
