// Supabase Edge Function: send-push
// Deploy: supabase functions deploy send-push
// Schedule: bật trong Supabase Dashboard → Edge Functions → send-push → Schedule → "*/15 * * * *"
//
// Env vars cần set trong Supabase Dashboard → Settings → Edge Functions:
//   VAPID_PUBLIC_KEY   — public key (npx web-push generate-vapid-keys)
//   VAPID_PRIVATE_KEY  — private key
//   VAPID_SUBJECT      — mailto:your@email.com

import webpush from 'npm:web-push@3'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async () => {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // Tasks due today, not done
  const { data: tasks } = await supabase
    .from('tasks')
    .select('user_id, title')
    .eq('scheduled_date', todayStr)
    .eq('status', 'todo')

  // Meetings in next 30 min
  const in30 = new Date(now.getTime() + 30 * 60_000)
  const { data: meetings } = await supabase
    .from('meetings')
    .select('user_id, title, client_name, scheduled_at')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in30.toISOString())

  // Group by userId
  const byUser: Record<string, { title: string; body: string; url: string }[]> = {}

  if (tasks?.length) {
    const counts: Record<string, number> = {}
    for (const t of tasks) counts[t.user_id] = (counts[t.user_id] ?? 0) + 1
    for (const [uid, count] of Object.entries(counts)) {
      ;(byUser[uid] ??= []).push({
        title: 'FlowDesk — Việc hôm nay',
        body:  `Còn ${count} task chưa hoàn thành`,
        url:   '/today',
      })
    }
  }

  if (meetings?.length) {
    for (const m of meetings) {
      const time = new Date(m.scheduled_at).toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit',
      })
      ;(byUser[m.user_id] ??= []).push({
        title: `Lịch hẹn lúc ${time}`,
        body:  `${m.title} — ${m.client_name}`,
        url:   '/calendar',
      })
    }
  }

  let sent = 0, failed = 0

  for (const [userId, notifs] of Object.entries(byUser)) {
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs?.length) continue

    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      for (const n of notifs) {
        try {
          await webpush.sendNotification(pushSub, JSON.stringify(n))
          sent++
        } catch (err: unknown) {
          failed++
          // Remove expired/gone subscriptions
          const code = (err as { statusCode?: number })?.statusCode
          if (code === 410 || code === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          }
        }
      }
    }
  }

  return Response.json({
    ok: true,
    sent,
    failed,
    users: Object.keys(byUser).length,
    ts: now.toISOString(),
  })
})
