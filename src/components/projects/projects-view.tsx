'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useProjects, useCreateProject } from '@/hooks/use-projects'
import { db } from '@/db'
import type { Project } from '@/types'

const COLOR_PALETTE = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#6366F1', '#14B8A6',
]

export function ProjectsView() {
  const { user } = useAuth()
  const router = useRouter()
  const { data: projects = [], isLoading } = useProjects(user?.id ?? '')
  const createProject = useCreateProject()

  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [color, setColor]       = useState(COLOR_PALETTE[0])
  const [desc, setDesc]         = useState('')

  async function handleCreate() {
    if (!name.trim() || !user) return
    const project = await createProject.mutateAsync({
      user_id:     user.id,
      name:        name.trim(),
      color,
      description: desc.trim() || undefined,
    })
    // Mirror to Dexie so workspace can read it offline
    await db.projects.put(project as Project)
    setName('')
    setDesc('')
    setColor(COLOR_PALETTE[0])
    setShowForm(false)
    router.push(`/projects/${project.id}`)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-neutral-900">Dự án</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          {showForm ? '✕ Đóng' : '+ Tạo dự án'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
          <div className="font-medium text-sm text-neutral-900 mb-3">Dự án mới</div>

          {/* Name */}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            placeholder="Tên dự án..."
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white outline-none focus:border-neutral-400 mb-3 transition-colors"
          />

          {/* Color picker */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-neutral-500 w-12">Màu</span>
            <div className="flex gap-1.5">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: color === c ? `2px solid ${c}` : undefined, outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Mô tả ngắn (tuỳ chọn)..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white outline-none focus:border-neutral-400 mb-3 resize-none transition-colors"
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-neutral-500 border border-neutral-200 rounded-lg hover:bg-white transition-colors"
            >
              Huỷ
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || createProject.isPending}
              className="px-4 py-1.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:opacity-85 disabled:opacity-40 transition-opacity"
            >
              {createProject.isPending ? 'Đang tạo...' : 'Tạo dự án'}
            </button>
          </div>
        </div>
      )}

      {/* Project list */}
      {isLoading ? (
        <div className="text-center py-20 text-neutral-400 text-sm">Đang tải...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4 select-none">⬡</div>
          <div className="text-neutral-600 text-sm font-medium mb-1">Chưa có dự án nào</div>
          <div className="text-neutral-400 text-xs mb-6">Tạo dự án để quản lý công việc và lưu trữ theo từng chiến dịch</div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:opacity-85 transition-opacity"
          >
            Tạo dự án đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-all group"
    >
      {/* Color bar */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />
        <div className="font-medium text-neutral-900 group-hover:text-neutral-700 transition-colors truncate">
          {project.name}
        </div>
      </div>

      {project.description && (
        <div className="text-xs text-neutral-500 line-clamp-2 mb-3 ml-5">
          {project.description}
        </div>
      )}

      <div className="ml-5 flex items-center gap-2 text-xs text-neutral-400">
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
            project.status === 'active'  ? 'bg-emerald-50 text-emerald-600' :
            project.status === 'paused' ? 'bg-amber-50 text-amber-600' :
            'bg-neutral-100 text-neutral-500'
          }`}
        >
          {project.status === 'active' ? 'Đang chạy' : project.status === 'paused' ? 'Tạm dừng' : 'Xong'}
        </span>
      </div>
    </Link>
  )
}
