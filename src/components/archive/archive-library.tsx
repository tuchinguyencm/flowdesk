'use client'
import { useMemo, useState } from 'react'
import { useArchiveItems, deleteArchiveItem } from '@/hooks/use-archive'
import { useUIStore } from '@/store'
import { useAuth } from '@/lib/auth-context'
import { ArchiveCard } from './archive-card'
import type { ArchiveType, ArchivePurpose } from '@/types'

const TYPES: { value: ArchiveType | 'all'; label: string; icon: string }[] = [
  { value: 'all',     label: 'Tất cả',   icon: '◧' },
  { value: 'link',    label: 'Link',     icon: '🔗' },
  { value: 'image',   label: 'Ảnh',      icon: '🖼' },
  { value: 'article', label: 'Bài viết', icon: '📄' },
  { value: 'note',    label: 'Ghi chú',  icon: '📝' },
]

const PURPOSES: ArchivePurpose[] = [
  'Viết content', 'Đề án', 'Tham khảo', 'Thiết kế', 'Đo lường',
]

export function ArchiveLibrary() {
  const { user } = useAuth()
  const openQuickAdd = useUIStore((s) => s.openQuickAdd)

  const rawItems = useArchiveItems(user?.id ?? '')
  const allItems = rawItems ?? []

  const [typeFilter,    setTypeFilter]    = useState<ArchiveType | undefined>()
  const [purposeFilter, setPurposeFilter] = useState<ArchivePurpose | undefined>()
  const [search,        setSearch]        = useState('')

  const stats = useMemo(() => ({
    total:   allItems.length,
    link:    allItems.filter((i) => i.type === 'link').length,
    image:   allItems.filter((i) => i.type === 'image').length,
    article: allItems.filter((i) => i.type === 'article').length,
    note:    allItems.filter((i) => i.type === 'note').length,
  }), [allItems])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allItems.filter((item) => {
      if (typeFilter && item.type !== typeFilter) return false
      if (purposeFilter && !item.purpose.includes(purposeFilter)) return false
      if (q) {
        const hit =
          item.title.toLowerCase().includes(q) ||
          item.content?.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        if (!hit) return false
      }
      return true
    })
  }, [allItems, typeFilter, purposeFilter, search])

  const hasFilter = !!(typeFilter || purposeFilter || search.trim())

  function clearFilters() {
    setTypeFilter(undefined)
    setPurposeFilter(undefined)
    setSearch('')
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Lưu trữ</h1>
          <div className="text-sm text-neutral-400 mt-0.5">
            {stats.total} mục
            {stats.link    > 0 && ` · ${stats.link} link`}
            {stats.image   > 0 && ` · ${stats.image} ảnh`}
            {stats.article > 0 && ` · ${stats.article} bài viết`}
            {stats.note    > 0 && ` · ${stats.note} ghi chú`}
          </div>
        </div>
        <button
          onClick={() => openQuickAdd('archive')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          + Thêm vào kho
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            width="14" height="14" viewBox="0 0 14 14" fill="none"
          >
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M10 10L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tiêu đề, nội dung, tags..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-neutral-200 rounded-lg bg-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Type chips */}
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map((t) => {
            const active = t.value === 'all' ? !typeFilter : typeFilter === t.value
            const count  = t.value !== 'all' ? stats[t.value as ArchiveType] : undefined
            return (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value === 'all' ? undefined : t.value as ArchiveType)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
                {count !== undefined && (
                  <span className={`ml-0.5 text-[10px] ${active ? 'text-white/60' : 'text-neutral-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Purpose chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setPurposeFilter(undefined)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              !purposeFilter
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Tất cả mục đích
          </button>
          {PURPOSES.map((p) => (
            <button
              key={p}
              onClick={() => setPurposeFilter(purposeFilter === p ? undefined : p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                purposeFilter === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Active filter summary */}
      {hasFilter && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-neutral-400">
            {filtered.length} kết quả
            {filtered.length !== allItems.length && ` / ${allItems.length} mục`}
          </div>
          <button
            onClick={clearFilters}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors underline underline-offset-2"
          >
            Xoá filter
          </button>
        </div>
      )}

      {/* Content */}
      {allItems.length === 0 ? (
        <EmptyState onAdd={() => openQuickAdd('archive')} />
      ) : filtered.length === 0 ? (
        <NoResults onClear={clearFilters} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <ArchiveCard key={item.id} item={item} onDelete={deleteArchiveItem} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="text-5xl mb-4 select-none">◧</div>
      <div className="text-neutral-600 text-sm font-medium mb-1">Kho lưu trữ trống</div>
      <div className="text-neutral-400 text-xs mb-6">
        Lưu link, ảnh, bài viết, ghi chú để tái sử dụng sau
      </div>
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:opacity-85 transition-opacity"
      >
        Thêm mục đầu tiên
      </button>
    </div>
  )
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="text-neutral-400 text-sm">Không có mục nào phù hợp với filter</div>
      <button
        onClick={onClear}
        className="mt-3 text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2 transition-colors"
      >
        Xoá filter
      </button>
    </div>
  )
}
