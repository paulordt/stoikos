import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('stoic_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing?.reflection) return NextResponse.json(existing)

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Generate a daily Stoic reflection in JSON format with these fields:
- theme: a 2-4 word Stoic theme (e.g., "Memento Mori", "The Present Moment", "Amor Fati")
- reflection: 2-3 sentences of Stoic wisdom on this theme, grounded and practical
- practice: one specific action or mental exercise to embody this theme today

Return only valid JSON, no markdown.`
    }]
  })

  const text = (message.content[0] as { type: string; text: string }).text.trim()
  let parsed: { theme: string; reflection: string; practice: string }
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = {
      theme: 'The Present Moment',
      reflection: 'All we have is this moment. The Stoics remind us to focus on what is within our control — our attention, our choices, our character.',
      practice: 'Before each task today, pause for one breath and set a clear intention.'
    }
  }

  const { data: saved } = await supabase
    .from('stoic_entries')
    .upsert({
      user_id: user.id,
      date: today,
      theme: parsed.theme,
      reflection: parsed.reflection,
      practice: parsed.practice,
    }, { onConflict: 'user_id,date' })
    .select()
    .single()

  return NextResponse.json(saved || parsed)
}
