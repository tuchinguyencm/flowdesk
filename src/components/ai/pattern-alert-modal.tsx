'use client'
import { useEffect, useState } from 'react'
import type { PatternAlertResult, Task } from '@/types'

interface Props {
  task: Task
  onClose: () => void
}

export function PatternAlertModal({ task, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<PatternAlertResult | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/ai/pattern-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setResult(data) })
      .catch(() => { if (!cancelled) setResult({ reason: '', suggestion: '' }) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [task])

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-sm shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">⚠</span>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Bị hoãn {task.postpone_count} lần
            </span>
          </div>
          <h2 className="text-sm font-semibold text-neutral-900 leading-snug">{task.title}</h2>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
              <span className="text-sm text-neutral-500">Claude đang phân tích...</span>
            </div>
          ) : result ? (
            <div className="space-y-3">
              {result.reason && (
                <div>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Lý do khả năng</p>
                  <p className="text-sm text-neutral-700">{result.reason}</p>
                </div>
              )}
              {result.suggestion && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-emerald-600 mb-1">Làm ngay</p>
                  <p className="text-sm text-emerald-800 font-medium">{result.suggestion}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="px-5 py-3 border-t border-neutral-100 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:opacity-85 transition-opacity">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}
