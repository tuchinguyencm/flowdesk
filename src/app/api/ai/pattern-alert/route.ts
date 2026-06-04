import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Task } from '@/types'

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

  const { task } = (await request.json()) as { task: Task }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: [
      {
        type: 'text' as const,
        text: `Bạn là AI coach năng suất. Phân tích lý do task bị trì hoãn và đưa ra gợi ý hành động cụ thể bằng tiếng Việt. Trả về JSON hợp lệ, không giải thích.`,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Task "${task.title}" đã bị hoãn ${task.postpone_count ?? 0} lần.
Priority: ${task.priority ?? 'chưa đặt'}
Ghi chú: ${task.note ?? 'không có'}

Phân tích JSON:
{
  "reason": "lý do khả năng cao task này bị trì hoãn (1-2 câu thực tế, không chung chung)",
  "suggestion": "1 hành động cụ thể ngay bây giờ để xử lý task này (bắt đầu bằng động từ)"
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
