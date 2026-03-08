import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Whoop webhook payload
  const payload = await request.json()

  // Basic validation — extend with Whoop's actual webhook signature
  if (!payload) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = await createClient()

  // Handle Whoop sleep data
  if (payload.type === 'sleep.updated' || payload.type === 'sleep.created') {
    const sleep = payload.data
    const userId = payload.user_id

    await supabase
      .from('sleep_logs')
      .upsert({
        user_id: userId,
        date: new Date(sleep.start).toISOString().split('T')[0],
        bedtime: sleep.start,
        wake_time: sleep.end,
        quality: Math.round(sleep.score?.quality_duration_score / 20) || null,
        duration_hours: sleep.score?.stage_summary?.total_in_bed_time_milli
          ? sleep.score.stage_summary.total_in_bed_time_milli / 3600000
          : null,
        source: 'whoop',
      })
  }

  return NextResponse.json({ received: true })
}
