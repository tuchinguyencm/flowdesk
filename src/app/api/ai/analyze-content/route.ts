import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

  const { text } = await request.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: [
      {
        type: 'text' as const,
        text: `Bạn là AI phân tích nội dung cho ứng dụng lưu trữ FlowDesk. Phân tích URL/text và trích xuất metadata để lưu vào thư viện. Luôn trả về JSON hợp lệ, không giải thích, không markdown.

Types có thể dùng: "link" (bookmark web), "article" (bài viết dài), "image" (ảnh), "note" (ghi chú văn bản)
Purposes có thể dùng: "Viết content", "Đề án", "Tham khảo", "Thiết kế", "Đo lường"`,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Phân tích nội dung sau và trả về JSON với format chính xác:
{
  "title": "tiêu đề ngắn gọn tiếng Việt (tối đa 80 ký tự)",
  "type": "link hoặc article hoặc image hoặc note",
  "tags": ["2-4 tags tiếng Việt liên quan"],
  "purpose": ["các purpose phù hợp từ danh sách trên"],
  "content": "tóm tắt ngắn tiếng Việt nếu là article, null nếu không"
}

Nội dung cần phân tích:
${text.slice(0, 2000)}`,
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
    return NextResponse.json({ error: 'AI response parse failed' }, { status: 500 })
  }
}
