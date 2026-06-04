export type TaskPriority = 'high' | 'mid' | 'low'
export type TaskStatus = 'todo' | 'done' | 'cancelled'
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | string
export type ArchiveType = 'image' | 'article' | 'link' | 'note'
export type ArchivePurpose = 'Viết content' | 'Đề án' | 'Tham khảo' | 'Thiết kế' | 'Đo lường'
export type MeetingMode = 'online' | 'offline' | 'phone'

export interface Project {
  id: string
  user_id: string
  name: string
  color: string
  description?: string
  status: 'active' | 'paused' | 'done'
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id?: string
  title: string
  note?: string
  status: TaskStatus
  priority?: TaskPriority
  time_slot?: TimeSlot
  scheduled_date?: string   // YYYY-MM-DD
  scheduled_time?: string   // HH:mm
  completed_at?: string
  created_at: string
  postpone_count?: number   // local-only: incremented each time task is moved to next day
  _synced?: boolean
}

export interface ArchiveItem {
  id: string
  user_id: string
  project_id?: string
  type: ArchiveType
  title: string
  storage_url?: string      // ảnh/file → Supabase Storage URL
  source_url?: string       // link/article → URL gốc
  content?: string          // nội dung ghi chú / article
  purpose: ArchivePurpose[]
  tags: string[]
  metadata?: {
    file_size?: number
    mime_type?: string
    width?: number
    height?: number
  }
  created_at: string
  _synced?: boolean
}

export interface Meeting {
  id: string
  user_id: string
  project_id?: string
  title: string
  client_name: string
  scheduled_at: string      // ISO datetime
  mode: MeetingMode
  location?: string         // địa điểm hoặc link meet
  notes?: string            // ghi chú sau buổi gặp
  agenda?: string
  created_at: string
  _synced?: boolean
}

// AI feature types
export interface AnalyzeContentResult {
  title: string
  type: ArchiveType
  tags: string[]
  purpose: ArchivePurpose[]
  content: string | null
}

export interface WeeklyInsightResult {
  summary: string
  completion_rate: number
  patterns: string[]
  busiest_slot: 'morning' | 'afternoon' | 'evening'
  most_repeated_task: string | null
  suggestion: string
}

export interface PatternAlertResult {
  reason: string
  suggestion: string
}

// Quick Add form types
export type QuickAddTab = 'task' | 'archive' | 'meeting'

export interface QuickAddTaskInput {
  title: string
  project_id?: string
  scheduled_date: string
  time_slot?: TimeSlot
  priority?: TaskPriority
  note?: string
}

export interface QuickAddArchiveInput {
  type: ArchiveType
  title: string
  file?: File
  source_url?: string
  project_id?: string
  purpose: ArchivePurpose[]
  tags: string[]
}

export interface QuickAddMeetingInput {
  title: string
  client_name: string
  scheduled_at: string
  mode: MeetingMode
  project_id?: string
  agenda?: string
}
