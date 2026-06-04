'use client'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { useUIStore } from '@/store'
import { addTask } from '@/hooks/use-today-tasks'
import { useAuth } from '@/lib/auth-context'
import { useProjects } from '@/hooks/use-projects'
import { db } from '@/db'
import { uploadArchiveFile } from '@/lib/sync'
import type { QuickAddTab, ArchiveType, ArchivePurpose, MeetingMode } from '@/types'

// ── Schemas ──────────────────────────────────────────────────────
const taskSchema = z.object({
  title:      z.string().min(1, 'Nhập tên task'),
  project_id: z.string().optional(),
  time_slot:  z.enum(['morning', 'afternoon', 'evening']).optional(),
  priority:   z.enum(['high', 'mid', 'low']).optional(),
  note:       z.string().optional(),
})

const archiveSchema = z.object({
  title:      z.string().min(1, 'Nhập tiêu đề'),
  source_url: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  content:    z.string().optional(),
  project_id: z.string().optional(),
  tags:       z.string().optional(),
})

const meetingSchema = z.object({
  title:        z.string().min(1, 'Nhập tiêu đề'),
  client_name:  z.string().min(1, 'Nhập tên khách hàng'),
  scheduled_at: z.string().min(1, 'Chọn ngày giờ'),
  duration_min: z.number().optional(),
  mode:         z.enum(['online', 'offline', 'phone']).optional(),
  location:     z.string().optional(),
  agenda:       z.string().optional(),
  project_id:   z.string().optional(),
})

type TaskForm    = z.infer<typeof taskSchema>
type ArchiveForm = z.infer<typeof archiveSchema>
type MeetingForm = z.infer<typeof meetingSchema>

// ── Modal shell ──────────────────────────────────────────────────
export function QuickAddModal() {
  const { quickAddOpen, quickAddTab, closeQuickAdd, openQuickAdd } = useUIStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        quickAddOpen ? closeQuickAdd() : openQuickAdd('task')
      }
      if (e.key === 'Escape' && quickAddOpen) closeQuickAdd()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [quickAddOpen, closeQuickAdd, openQuickAdd])

  useEffect(() => {
    if (quickAddOpen) setTimeout(() => inputRef.current?.focus(), 60)
  }, [quickAddOpen])

  if (!quickAddOpen) return null

  const TAB_LABELS: Record<QuickAddTab, string> = {
    task: '✓ Task', archive: '◧ Lưu trữ', meeting: '◫ Lịch hẹn',
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={closeQuickAdd} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-lg shadow-xl overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <div className="flex gap-1 bg-neutral-100 rounded-lg p-1">
              {(['task', 'archive', 'meeting'] as QuickAddTab[]).map((tab) => (
                <button key={tab} onClick={() => openQuickAdd(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    quickAddTab === tab
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}>
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
            <button onClick={closeQuickAdd}
              className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 text-sm">
              ✕
            </button>
          </div>

          {quickAddTab === 'task'    && <TaskForm    inputRef={inputRef} onClose={closeQuickAdd} />}
          {quickAddTab === 'archive' && <ArchiveForm inputRef={inputRef} onClose={closeQuickAdd} />}
          {quickAddTab === 'meeting' && <MeetingForm inputRef={inputRef} onClose={closeQuickAdd} />}
        </div>
      </div>
    </>
  )
}

// ── Shared footer ────────────────────────────────────────────────
function Footer({ onClose, label, loading }: { onClose: () => void; label: string; loading?: boolean }) {
  return (
    <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between">
      <span className="text-xs text-neutral-300">
        <kbd className="px-1.5 py-0.5 border border-neutral-200 rounded text-neutral-400">⌘↵</kbd> lưu nhanh
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={onClose}
          className="px-3 py-1.5 text-sm text-neutral-500 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
          Huỷ
        </button>
        <button type="submit" disabled={loading}
          className="px-4 py-1.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:opacity-85 disabled:opacity-40 transition-opacity">
          {loading ? 'Đang lưu...' : label}
        </button>
      </div>
    </div>
  )
}

// ── Shared project selector ──────────────────────────────────────
function ProjectSelect({ userId, value, onChange }: {
  userId: string
  value?: string
  onChange: (id: string) => void
}) {
  const { data: projects = [] } = useProjects(userId)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-400 w-16 shrink-0">Dự án</span>
      <div className="flex gap-1.5 flex-wrap">
        <button type="button" onClick={() => onChange('')}
          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
            !value ? 'border-neutral-900 text-neutral-900 bg-neutral-50' : 'border-neutral-200 text-neutral-500'
          }`}>
          Cá nhân
        </button>
        {projects.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange(p.id)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors flex items-center gap-1 ${
              value === p.id ? 'border-neutral-900 text-neutral-900 bg-neutral-50' : 'border-neutral-200 text-neutral-500'
            }`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 1. TASK FORM ─────────────────────────────────────────────────
function TaskForm({ inputRef, onClose }: { inputRef: React.RefObject<HTMLInputElement | null>; onClose: () => void }) {
  const { user } = useAuth()
  const [projectId, setProjectId] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
  })

  const onSubmit = async (data: TaskForm) => {
    await addTask({
      user_id:        user?.id ?? 'local',
      title:          data.title,
      status:         'todo',
      time_slot:      data.time_slot,
      priority:       data.priority,
      note:           data.note,
      project_id:     projectId || undefined,
      scheduled_date: today,
    })
    reset()
    onClose()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-4 pt-3 pb-0">
        <input {...register('title')}
          ref={(e) => { register('title').ref(e); (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e }}
          placeholder="Tên công việc..."
          className="w-full text-base font-medium text-neutral-900 placeholder-neutral-300 outline-none pb-3 border-b border-neutral-100" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        <ProjectSelect userId={user?.id ?? ''} value={projectId} onChange={setProjectId} />

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-16 shrink-0">Khung giờ</span>
          <div className="flex gap-1.5">
            {[['morning','Sáng'],['afternoon','Chiều'],['evening','Tối']].map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" {...register('time_slot')} value={v} className="sr-only peer" defaultChecked={v === 'morning'} />
                <span className="px-2.5 py-1 rounded-full text-xs border border-neutral-200 text-neutral-500 peer-checked:border-neutral-900 peer-checked:text-neutral-900 peer-checked:bg-neutral-50 transition-colors">{l}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-16 shrink-0">Ưu tiên</span>
          <div className="flex gap-1.5">
            {[['high','Cao'],['mid','TB'],['low','Thấp']].map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" {...register('priority')} value={v} className="sr-only peer" />
                <span className="px-2.5 py-1 rounded-full text-xs border border-neutral-200 text-neutral-500 peer-checked:border-neutral-900 peer-checked:text-neutral-900 peer-checked:bg-neutral-50 transition-colors">{l}</span>
              </label>
            ))}
          </div>
        </div>

        <textarea {...register('note')} placeholder="Ghi chú..." rows={2}
          className="w-full text-sm text-neutral-600 placeholder-neutral-300 border-t border-neutral-100 pt-3 outline-none resize-none" />
      </div>

      <Footer onClose={onClose} label="Lưu task" />
    </form>
  )
}

// ── 2. ARCHIVE FORM ──────────────────────────────────────────────
const ARCHIVE_TYPES: { value: ArchiveType; label: string; icon: string }[] = [
  { value: 'link',    label: 'Link',     icon: '🔗' },
  { value: 'article', label: 'Bài viết', icon: '📄' },
  { value: 'image',   label: 'Ảnh',      icon: '🖼' },
  { value: 'note',    label: 'Ghi chú',  icon: '📝' },
]

const PURPOSES: ArchivePurpose[] = ['Viết content', 'Đề án', 'Tham khảo', 'Thiết kế', 'Đo lường']

function ArchiveForm({ inputRef, onClose }: { inputRef: React.RefObject<HTMLInputElement | null>; onClose: () => void }) {
  const { user } = useAuth()
  const [type, setType] = useState<ArchiveType>('link')
  const [purposes, setPurposes] = useState<ArchivePurpose[]>([])
  const [projectId, setProjectId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ArchiveForm>({
    resolver: zodResolver(archiveSchema),
  })

  const togglePurpose = (p: ArchivePurpose) =>
    setPurposes((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])

  const handleAiAnalyze = async () => {
    if (!aiText.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      setValue('title', data.title ?? '')
      setValue('source_url', aiText.startsWith('http') ? aiText : '')
      if (data.content) setValue('content', data.content)
      if (data.tags?.length) setValue('tags', data.tags.join(', '))
      if (data.type) setType(data.type)
      if (data.purpose?.length) setPurposes(data.purpose)
      setAiOpen(false)
      setAiText('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch {
      // silently fail — user can fill manually
    } finally {
      setAiLoading(false)
    }
  }

  const onSubmit = async (data: ArchiveForm) => {
    setLoading(true)
    try {
      let storage_url: string | undefined
      if (file && user) {
        storage_url = await uploadArchiveFile(file, user.id, projectId || undefined)
      }

      await db.archive_items.add({
        id:          uuid(),
        user_id:     user?.id ?? 'local',
        project_id:  projectId || undefined,
        type,
        title:       data.title,
        source_url:  data.source_url || undefined,
        content:     data.content || undefined,
        storage_url,
        purpose:     purposes,
        tags:        data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        metadata:    file ? { file_size: file.size, mime_type: file.type } : {},
        created_at:  new Date().toISOString(),
        _synced:     false,
      })
      reset()
      setFile(null)
      setPurposes([])
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Smart Quick Add — AI paste area */}
      <div className="px-4 pt-3">
        {aiOpen ? (
          <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-medium text-violet-700">✦ AI tự điền</span>
              <span className="text-xs text-violet-400">— dán URL hoặc đoạn văn bản</span>
            </div>
            <textarea
              autoFocus
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAiAnalyze() }}
              placeholder="https://example.com/article hoặc dán nội dung bất kỳ..."
              rows={3}
              className="w-full text-sm text-neutral-700 placeholder-violet-300 bg-white border border-violet-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400 resize-none transition-colors"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-violet-400">⌘↵ phân tích</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setAiOpen(false); setAiText('') }}
                  className="px-2.5 py-1 text-xs text-violet-500 hover:text-violet-700 transition-colors">
                  Huỷ
                </button>
                <button type="button" onClick={handleAiAnalyze} disabled={aiLoading || !aiText.trim()}
                  className="px-3 py-1 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors">
                  {aiLoading ? 'Đang phân tích...' : 'Phân tích'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAiOpen(true)}
            className="mb-2 flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 transition-colors">
            <span>✦</span> Tự điền từ URL / text
          </button>
        )}
      </div>

      {/* Type selector */}
      <div className="px-4 flex gap-1.5">
        {ARCHIVE_TYPES.map((t) => (
          <button key={t.value} type="button" onClick={() => setType(t.value)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
              type === t.value ? 'border-neutral-900 bg-neutral-50 text-neutral-900' : 'border-neutral-200 text-neutral-500'
            }`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 pb-0">
        <input {...register('title')}
          ref={(e) => { register('title').ref(e); (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e }}
          placeholder={type === 'note' ? 'Tiêu đề ghi chú...' : type === 'image' ? 'Mô tả ảnh...' : 'Tiêu đề / mô tả ngắn...'}
          className="w-full text-base font-medium text-neutral-900 placeholder-neutral-300 outline-none pb-3 border-b border-neutral-100" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {(type === 'link' || type === 'article') && (
          <div>
            <input {...register('source_url')}
              placeholder="https://..."
              className="w-full text-sm text-neutral-600 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-neutral-400 transition-colors" />
            {errors.source_url && <p className="text-xs text-red-500 mt-1">{errors.source_url.message}</p>}
          </div>
        )}

        {type === 'image' && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`w-full py-3 border border-dashed rounded-lg text-sm transition-colors ${
                file ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-neutral-200 text-neutral-400 hover:border-neutral-300'
              }`}>
              {file ? `✓ ${file.name}` : '+ Chọn ảnh từ máy tính'}
            </button>
          </div>
        )}

        {(type === 'note' || type === 'article') && (
          <textarea {...register('content')} placeholder="Nội dung..." rows={3}
            className="w-full text-sm text-neutral-600 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-neutral-400 resize-none transition-colors" />
        )}

        <div className="flex items-start gap-2">
          <span className="text-xs text-neutral-400 w-16 shrink-0 pt-1">Dùng cho</span>
          <div className="flex gap-1.5 flex-wrap">
            {PURPOSES.map((p) => (
              <button key={p} type="button" onClick={() => togglePurpose(p)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  purposes.includes(p) ? 'border-neutral-900 text-neutral-900 bg-neutral-50' : 'border-neutral-200 text-neutral-500'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <ProjectSelect userId={user?.id ?? ''} value={projectId} onChange={setProjectId} />

        <input {...register('tags')} placeholder="Tags (cách bằng dấu phẩy): ux, brand..."
          className="w-full text-sm text-neutral-500 placeholder-neutral-300 border-t border-neutral-100 pt-3 outline-none" />
      </div>

      <Footer onClose={onClose} label="Lưu vào kho" loading={loading} />
    </form>
  )
}

// ── 3. MEETING FORM ──────────────────────────────────────────────
const MODES: { value: MeetingMode; label: string }[] = [
  { value: 'offline', label: 'Gặp trực tiếp' },
  { value: 'online',  label: 'Online' },
  { value: 'phone',   label: 'Điện thoại' },
]

function MeetingForm({ inputRef, onClose }: { inputRef: React.RefObject<HTMLInputElement | null>; onClose: () => void }) {
  const { user } = useAuth()
  const [mode, setMode] = useState<MeetingMode>('offline')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MeetingForm>({
    resolver: zodResolver(meetingSchema),
    defaultValues: { mode: 'offline', duration_min: 60 },
  })

  const onSubmit = async (data: MeetingForm) => {
    setLoading(true)
    try {
      await db.meetings.add({
        id:           uuid(),
        user_id:      user?.id ?? 'local',
        project_id:   projectId || undefined,
        title:        data.title,
        client_name:  data.client_name,
        scheduled_at: new Date(data.scheduled_at).toISOString(),
        mode,
        location:     data.location || undefined,
        agenda:       data.agenda || undefined,
        created_at:   new Date().toISOString(),
        _synced:      false,
      })
      reset()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  // Gợi ý datetime mặc định = ngày mai 9:00
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  const defaultDt = tomorrow.toISOString().slice(0, 16)

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-4 pt-3 pb-0">
        <input {...register('title')}
          ref={(e) => { register('title').ref(e); (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e }}
          placeholder="Tiêu đề cuộc gặp..."
          className="w-full text-base font-medium text-neutral-900 placeholder-neutral-300 outline-none pb-3 border-b border-neutral-100" />
        {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Khách hàng */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-16 shrink-0">Khách hàng</span>
          <input {...register('client_name')} placeholder="Tên khách hàng / đối tác..."
            className="flex-1 text-sm text-neutral-700 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-1.5 outline-none focus:border-neutral-400 transition-colors" />
        </div>
        {errors.client_name && <p className="text-xs text-red-500 -mt-2 ml-[72px]">{errors.client_name.message}</p>}

        {/* Ngày giờ */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-16 shrink-0">Thời gian</span>
          <input {...register('scheduled_at')} type="datetime-local" defaultValue={defaultDt}
            className="flex-1 text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-1.5 outline-none focus:border-neutral-400 transition-colors" />
        </div>

        {/* Hình thức */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-16 shrink-0">Hình thức</span>
          <div className="flex gap-1.5">
            {MODES.map((m) => (
              <button key={m.value} type="button" onClick={() => setMode(m.value)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  mode === m.value ? 'border-neutral-900 text-neutral-900 bg-neutral-50' : 'border-neutral-200 text-neutral-500'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Địa điểm / link */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-16 shrink-0">
            {mode === 'online' ? 'Link meet' : mode === 'phone' ? 'Số điện thoại' : 'Địa điểm'}
          </span>
          <input {...register('location')}
            placeholder={mode === 'online' ? 'https://meet.google.com/...' : mode === 'phone' ? '0901...' : 'Địa chỉ gặp mặt'}
            className="flex-1 text-sm text-neutral-600 placeholder-neutral-300 border border-neutral-200 rounded-lg px-3 py-1.5 outline-none focus:border-neutral-400 transition-colors" />
        </div>

        <ProjectSelect userId={user?.id ?? ''} value={projectId} onChange={setProjectId} />

        <textarea {...register('agenda')} placeholder="Agenda / mục tiêu buổi gặp..." rows={2}
          className="w-full text-sm text-neutral-600 placeholder-neutral-300 border-t border-neutral-100 pt-3 outline-none resize-none" />
      </div>

      <Footer onClose={onClose} label="Lưu lịch hẹn" loading={loading} />
    </form>
  )
}
