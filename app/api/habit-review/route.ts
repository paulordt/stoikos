import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get last 7 days of habit data
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 6)

  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, category')
    .eq('user_id', user.id)
    .eq('active', true)

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('habit_id, date, completed')
    .eq('user_id', user.id)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (!habits || habits.length === 0) {
    return NextResponse.json({ review: 'Track habits this week to receive your weekly Stoic review.' })
  }

  const summary = habits.map(habit => {
    const habitLogs = logs?.filter(l => l.habit_id === habit.id && l.completed) || []
    return `${habit.name}: ${habitLogs.length}/7 days`
  }).join(', ')

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Weekly habit summary: ${summary}

Write a brief weekly Stoic reflection (3-4 sentences) on this person's consistency. Acknowledge wins, gently note where they fell short without judgment, and end with one Stoic insight about building character through small daily actions. Be warm and grounding.`
    }]
  })

  const review = (message.content[0] as { type: string; text: string }).text.trim()
  return NextResponse.json({ review })
}
