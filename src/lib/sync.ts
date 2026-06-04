import { db } from '@/db'
import { createClient } from '@/lib/supabase'
import type { Task, ArchiveItem, Meeting } from '@/types'

const supabase = createClient()

export async function pushUnsyncedData(userId: string) {
  const [tasks, archiveItems, meetings] = await Promise.all([
    db.tasks.where('_synced').equals(0 as any).and(t => t.user_id === userId).toArray(),
    db.archive_items.where('_synced').equals(0 as any).and(a => a.user_id === userId).toArray(),
    db.meetings.where('_synced').equals(0 as any).and(m => m.user_id === userId).toArray(),
  ])

  if (tasks.length) {
    const clean = tasks.map(({ _synced, ...t }) => t)
    const { error } = await supabase.from('tasks').upsert(clean)
    if (!error) await db.tasks.bulkPut(tasks.map(t => ({ ...t, _synced: true })))
  }

  if (archiveItems.length) {
    const clean = archiveItems.map(({ _synced, ...a }) => a)
    const { error } = await supabase.from('archive_items').upsert(clean)
    if (!error) await db.archive_items.bulkPut(archiveItems.map(a => ({ ...a, _synced: true })))
  }

  if (meetings.length) {
    const clean = meetings.map(({ _synced, ...m }) => m)
    const { error } = await supabase.from('meetings').upsert(clean)
    if (!error) await db.meetings.bulkPut(meetings.map(m => ({ ...m, _synced: true })))
  }
}

export async function pullFromSupabase(userId: string) {
  const [{ data: tasks }, { data: archive }, { data: meetings }, { data: projects }] =
    await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('archive_items').select('*').eq('user_id', userId),
      supabase.from('meetings').select('*').eq('user_id', userId),
      supabase.from('projects').select('*').eq('user_id', userId),
    ])

  if (tasks)    await db.tasks.bulkPut(tasks.map((t: Task) => ({ ...t, _synced: true })))
  if (archive)  await db.archive_items.bulkPut(archive.map((a: ArchiveItem) => ({ ...a, _synced: true })))
  if (meetings) await db.meetings.bulkPut(meetings.map((m: Meeting) => ({ ...m, _synced: true })))
  if (projects) await db.projects.bulkPut(projects)
}

export async function uploadArchiveFile(
  file: File,
  userId: string,
  projectId?: string
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${projectId ?? 'general'}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('archive-files')
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('archive-files')
    .getPublicUrl(data.path)

  return publicUrl
}

export async function initSync(userId: string) {
  await pullFromSupabase(userId)
  await pushUnsyncedData(userId)
  window.addEventListener('online', () => pushUnsyncedData(userId))
}
