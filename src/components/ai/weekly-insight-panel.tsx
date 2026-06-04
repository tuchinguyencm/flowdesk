'use client'
import { useState } from 'react'
import { db } from '@/db'
import type { WeeklyInsightResult } from '@/types'

const SLOT_LABEL: Record<string, string> = {
  morning: 'buổi sáng',
  afternoon: 'buổi chiều',
  evening: 'buổi tối',
}

interface Props {
  onClose: () => void
}

export function WeeklyInsightPanel({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<WeeklyInsightResult | null>(null)
  const [error, setError] = useState('')

  const runInsight = async () => {
    setLoading(true)
    setError('')
    try {
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 6)

      const weekStart = weekAgo.toISOString().split('T')[0]
      const weekEnd = today.toISOString().split('T')[0]

      const allTasks = await db.tasks
        .where('scheduled_date')
        .between(weekStart, weekEnd, true, true)
        .toArray()

      const allMeetings = await db.meetings
        .filter((m) => {
          const d = m.scheduled_at.slice(0, 10)
          return d >= weekStart && d <= weekEnd
        })
        .toArray()

      const res = await fetch('/api/ai/weekly-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: allTasks, meetings: allMeetings, weekStart }),
      })
      if (!res.ok) throw new Error('API error')
      setInsight(await res.json())
    } catch {
      setError('Không thể tải insight. Thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">✦ Insight tuần này</h2>
            <p className="text-xs text-neutral-400 mt-0.5">7 ngày gần nhất</p>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 text-sm">
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          {!insight && !loading && (
            <div className="text-center py-6">
              <div className="text-3xl mb-3">📊</div>
              <p className="text-sm text-neutral-500 mb-4">
                Claude sẽ đọc toàn bộ tasks và meetings 7 ngày qua, phân tích pattern và đưa ra gợi ý.
              </p>
              {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
              <button onClick={runInsight}
                className="px-5 py-2 bg-neutral-900 text-white text-sm rounded-lg hover:opacity-85 transition-opacity">
                Phân tích ngay
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block w-5 h-5 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mb-3" />
              <p className="text-sm text-neutral-500">Claude đang đọc dữ liệu tuần của bạn...</p>
            </div>
          )}

          {insight && (
            <div className="space-y-4">
              {/* Summary */}
              <p className="text-sm font-medium text-neutral-800">{insight.summary}</p>

              {/* Completion rate */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${insight.completion_rate}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-emerald-600 w-10 text-right">
                  {insight.completion_rate}%
                </span>
              </div>

              {/* Patterns */}
              <div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Patterns</p>
                <ul className="space-y-1.5">
                  {insight.patterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                      <span className="text-neutral-300 mt-0.5">—</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats row */}
              <div className="flex gap-3">
                {insight.busiest_slot && (
                  <div className="flex-1 bg-neutral-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-neutral-400 mb-0.5">Bận nhất</p>
                    <p className="text-sm font-medium text-neutral-800 capitalize">
                      {SLOT_LABEL[insight.busiest_slot] ?? insight.busiest_slot}
                    </p>
                  </div>
                )}
                {insight.most_repeated_task && (
                  <div className="flex-1 bg-neutral-50 rounded-xl px-3 py-2.5 min-w-0">
                    <p className="text-xs text-neutral-400 mb-0.5">Task lặp nhiều nhất</p>
                    <p className="text-sm font-medium text-neutral-800 truncate">{insight.most_repeated_task}</p>
                  </div>
                )}
              </div>

              {/* Suggestion */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs font-medium text-amber-600 mb-1">Gợi ý tuần sau</p>
                <p className="text-sm text-amber-800">{insight.suggestion}</p>
              </div>

              <button onClick={runInsight}
                className="w-full text-xs text-neutral-400 hover:text-neutral-600 py-1 transition-colors">
                Phân tích lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
