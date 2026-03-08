import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, context } = await request.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    context?: {
      sleep_quality?: number
      ritual_completion?: number
      habits_today?: number
    }
  }

  const systemPrompt = `You are a Stoic mind coach — wise, grounding, and practical. You blend ancient Stoic philosophy with modern psychological insights. You ask good questions, offer perspective without preaching, and always bring the conversation back to what the person can control.

Current context:
- Sleep quality last night: ${context?.sleep_quality ? `${context.sleep_quality}/5` : 'unknown'}
- Today's ritual completion: ${context?.ritual_completion !== undefined ? `${Math.round(context.ritual_completion * 100)}%` : 'unknown'}
- Habits completed today: ${context?.habits_today ?? 'unknown'}

Keep responses concise (2-4 sentences) unless asked for more. Be a coach, not a therapist.`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: systemPrompt,
    messages,
  })

  const reply = (response.content[0] as { type: string; text: string }).text.trim()
  return NextResponse.json({ reply })
}
