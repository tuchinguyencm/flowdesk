import type { Metadata } from 'next'
import { ArchiveLibrary } from '@/components/archive/archive-library'

export const metadata: Metadata = {
  title: 'Lưu trữ — FlowDesk',
}

export default function ArchivePage() {
  return <ArchiveLibrary />
}
