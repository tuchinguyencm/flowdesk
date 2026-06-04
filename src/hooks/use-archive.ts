'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { ArchiveItem } from '@/types'

export function useArchiveItems(userId: string) {
  return useLiveQuery(
    () =>
      db.archive_items
        .where('user_id')
        .equals(userId)
        .toArray()
        .then((items) =>
          items.sort((a, b) => b.created_at.localeCompare(a.created_at))
        ),
    [userId]
  )
}

export async function deleteArchiveItem(id: string) {
  await db.archive_items.delete(id)
}
