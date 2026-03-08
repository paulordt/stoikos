import { NextResponse } from 'next/server'
import { anthropic, MODEL } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const image = formData.get('image') as File | null
  const description = formData.get('description') as string | null

  if (!image && !description) {
    return NextResponse.json({ error: 'No image or description provided' }, { status: 400 })
  }

  let messageContent: Parameters<typeof anthropic.messages.create>[0]['messages'][0]['content']

  if (image) {
    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = image.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    messageContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 }
      },
      {
        type: 'text',
        text: 'Analyze this food image and return estimated nutritional info in JSON format with fields: name (string), calories (number), protein (number in grams), carbs (number in grams), fat (number in grams), meal_type (breakfast|lunch|dinner|snack). Be reasonably accurate. Return only valid JSON.'
      }
    ]
  } else {
    messageContent = `Analyze this food: "${description}". Return estimated nutritional info as JSON with fields: name (string), calories (number), protein (number in grams), carbs (number in grams), fat (number in grams), meal_type (breakfast|lunch|dinner|snack). Return only valid JSON.`
  }

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: messageContent }]
  })

  const text = (message.content[0] as { type: string; text: string }).text.trim()
  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse food data' }, { status: 500 })
  }
}
