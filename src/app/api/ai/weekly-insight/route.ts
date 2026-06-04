import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Task, Meeting } from '@/types'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tasks, meetings, weekStart } = (await request.json()) as {
    tasks: Task[]
    meetings: Meeting[]
    weekStart: string
  }

  const taskLines = tasks
    .map((t) => `- [${t.status === 'done' ? 'x' : ' '}] ${t.title} (${t.scheduled_date}${t.time_slot ? ` ${t.time_slot}` : ''})`)
    .join('\n')

  const meetingLines = meetings
    .map((m) => {
      const dt = new Date(m.scheduled_at)
      const label = `${dt.toLocaleDateString('vi-VN')} ${dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
      return `- ${m.title} (${label})`
    })
    .join('\n')

  const doneCount = tasks.filter((t) => t.status === 'done').length
  const completionRate =
    tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text' as const,
        text: `Bạn là AI coach năng suất cá nhân cho ứng dụng FlowDesk. Phân tích dữ liệu tuần làm việc và đưa ra insight thực tế, cụ thể bằng tiếng Việt. Chỉ trả về JSON hợp lệ, không giải thích.`,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Tuần từ ${weekStart} — ${tasks.length} tasks (hoàn thành ${completionRate}%), ${meetings.length} meetings.

TASKS:
${taskLines || '(không có task)'}

MEETINGS:
${meetingLines || '(không có meeting)'}

Trả về JSON:
{
  "summary": "1 câu tóm tắt tuần (cụ thể, có số liệu)",
  "completion_rate": ${completionRate},
  "patterns": ["3 pattern quan sát được từ data (không nói chung chung)"],
  "busiest_slot": "morning hoặc afternoon hoặc evening (slot có nhiều task nhất)",
  "most_repeated_task": "tiêu đề task xuất hiện nhiều nhất (hoặc null)",
  "suggestion": "1 hành động cụ thể nhất để cải thiện tuần sau"
}`,
      },
    ],
  })

  const raw =
    message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  try {
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Parse failed' }, { status: 500 })
  }
}
