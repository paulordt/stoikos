import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { went_well, do_differently, date } = await request.json() as {
    went_well: string
    do_differently: string
    date: string
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 180,
    messages: [{
      role: 'user',
      content: `A person is completing their evening Stoic reflection. They wrote:

What went well: "${went_well}"
What they'd do differently: "${do_differently}"

Write a brief, grounding closing thought (2-3 sentences) in a warm but Stoic voice — acknowledge their growth, remind them tomorrow is a fresh start, and end with a short Stoic insight. Do not use their names.`
    }]
  })

  const coach_response = (message.content[0] as { type: string; text: string }).text.trim()

  await supabase
    .from('evening_reflections')
    .upsert({
      user_id: user.id,
      date,
      went_well,
      do_differently,
      coach_response,
    }, { onConflict: 'user_id,date' })

  return NextResponse.json({ coach_response })
}
