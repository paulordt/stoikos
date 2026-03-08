import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { items } = await request.json() as { items: string[] }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `A person listed these three things they're grateful for today:
1. ${items[0] || ''}
2. ${items[1] || ''}
3. ${items[2] || ''}

Generate ONE follow-up question that invites deeper reflection on one of these items — the most interesting or emotionally resonant one. Make it thoughtful, specific, and Stoic in spirit. Return only the question.`
    }]
  })

  const prompt = (message.content[0] as { type: string; text: string }).text.trim()
  return NextResponse.json({ prompt })
}
