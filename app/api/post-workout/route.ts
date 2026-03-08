import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { routine_name, duration_min, exercises_completed } = await request.json() as {
    routine_name: string
    duration_min: number
    exercises_completed: number
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `A person just finished their "${routine_name}" workout — ${duration_min} minutes, ${exercises_completed} exercises completed. Write a brief, energizing post-workout message (1-2 sentences) in a Stoic voice. Acknowledge the effort and connect it to building character. Keep it punchy.`
    }]
  })

  const message_text = (message.content[0] as { type: string; text: string }).text.trim()
  return NextResponse.json({ message: message_text })
}
