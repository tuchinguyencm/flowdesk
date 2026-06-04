import type { Metadata } from 'next'
import { ProjectsView } from '@/components/projects/projects-view'

export const metadata: Metadata = {
  title: 'Dự án — FlowDesk',
}

export default function ProjectsPage() {
  return <ProjectsView />
}
