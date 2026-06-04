'use client'
import type { ArchiveItem } from '@/types'

const TYPE_META = {
  link:    { icon: '🔗', label: 'Link',     bg: 'bg-blue-50   text-blue-600'   },
  image:   { icon: '🖼',  label: 'Ảnh',      bg: 'bg-purple-50 text-purple-600' },
  article: { icon: '📄', label: 'Bài viết', bg: 'bg-amber-50  text-amber-600'  },
  note:    { icon: '📝', label: 'Ghi chú',  bg: 'bg-emerald-50 text-emerald-600' },
}

interface Props {
  item: ArchiveItem
  onDelete: (id: string) => void
}

export function ArchiveCard({ item, onDelete }: Props) {
  const meta = TYPE_META[item.type]
  const externalUrl = item.source_url || item.storage_url

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden group hover:shadow-md transition-all duration-200">
      {/* Image thumbnail */}
      {item.type === 'image' && item.storage_url && (
        <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
          <img
            src={item.storage_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-3.5">
        {/* Badge + actions */}
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${meta.bg}`}>
            {meta.icon} {meta.label}
          </span>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
                title="Mở link"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M9 3H5.5M9 3V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Xoá"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-sm font-medium text-neutral-900 leading-snug mb-1 line-clamp-2">
          {item.title}
        </div>

        {/* Domain — link & article */}
        {item.source_url && (
          <div className="text-xs text-neutral-400 truncate mb-1.5">
            {parseDomain(item.source_url)}
          </div>
        )}

        {/* Content preview — note & article */}
        {item.content && (
          <div className="text-xs text-neutral-500 line-clamp-3 leading-relaxed mb-1.5">
            {item.content}
          </div>
        )}

        {/* Purposes + tags */}
        {(item.purpose.length > 0 || item.tags.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.purpose.map((p) => (
              <span key={p} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                {p}
              </span>
            ))}
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded-full">
                #{tag}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-neutral-400 self-center">+{item.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function parseDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
