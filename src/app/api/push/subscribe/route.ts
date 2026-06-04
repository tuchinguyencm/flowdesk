import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  const { userId, subscription } = await request.json()

  if (!userId || !subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

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

  // Verify the request comes from the logged-in user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user || user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id:    userId,
      endpoint:   subscription.endpoint,
      p256dh:     subscription.keys?.p256dh ?? '',
      auth:       subscription.keys?.auth ?? '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
