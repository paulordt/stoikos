import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // Check cache
  const { data: existing } = await supabase
    .from('stoic_entries')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing?.reflection) {
    return NextResponse.json({ intention: existing.reflection.split('.')[0] + '.' })
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 80,
    messages: [{
      role: 'user',
      content: 'Generate a single powerful Stoic intention for today — one sentence, present tense, action-oriented. No quotes, no attribution. Just the sentence.'
    }]
  })

  const intention = (message.content[0] as { type: string; text: string }).text.trim()
  return NextResponse.json({ intention })
}
