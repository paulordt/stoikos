'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, BookOpen, Heart, Moon, MessageCircle, Bookmark, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StoicEntry {
  id: string
  theme: string | null
  reflection: string | null
  practice: string | null
  read: boolean
  saved: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function MindPage() {
  const [stoicEntry, setStoicEntry] = useState<StoicEntry | null>(null)
  const [stoicLoading, setStoicLoading] = useState(true)
  const [gratitudeItems, setGratitudeItems] = useState(['', '', ''])
  const [secondPrompt, setSecondPrompt] = useState('')
  const [secondAnswer, setSecondAnswer] = useState('')
  const secondAnswerRef = useRef('')
  const [answerSaved, setAnswerSaved] = useState(false)
  const [answerSaving, setAnswerSaving] = useState(false)
  const [gratitudeSaved, setGratitudeSaved] = useState(false)
  const [gratitudeLoading, setGratitudeLoading] = useState(false)
  const [reflectionForm, setReflectionForm] = useState({ went_well: '', do_differently: '' })
  const [reflectionResponse, setReflectionResponse] = useState('')
  const [reflectionLoading, setReflectionLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()
  const showEvening = hour >= 19

  useEffect(() => {
    loadStoicEntry()
    loadGratitude()
    if (showEvening) loadEveningReflection()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function loadStoicEntry() {
    setStoicLoading(true)
    try {
      const res = await fetch('/api/stoic-reflection')
      const data = await res.json()
      setStoicEntry(data)
    } catch {
      setStoicEntry(null)
    }
    setStoicLoading(false)
  }

  async function loadGratitude() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()

    if (data) {
      setGratitudeItems(data.items.length >= 3 ? data.items.slice(0, 3) : [...data.items, '', ''].slice(0, 3))
      setSecondPrompt(data.second_prompt || '')
      setSecondAnswer(data.second_answer || '')
      secondAnswerRef.current = data.second_answer || ''
      if (data.second_answer) setAnswerSaved(true)
      setGratitudeSaved(true)
    }
  }

  async function loadEveningReflection() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('evening_reflections')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single()
    if (data) {
      setReflectionForm({ went_well: data.went_well || '', do_differently: data.do_differently || '' })
      setReflectionResponse(data.coach_response || '')
    }
  }

  async function markStoicRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !stoicEntry) return
    await supabase.from('stoic_entries').update({ read: true }).eq('id', stoicEntry.id)
    setStoicEntry(e => e ? { ...e, read: true } : e)
  }

  async function toggleStoicSaved() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !stoicEntry) return
    const newSaved = !stoicEntry.saved
    await supabase.from('stoic_entries').update({ saved: newSaved }).eq('id', stoicEntry.id)
    setStoicEntry(e => e ? { ...e, saved: newSaved } : e)
  }

  async function saveGratitude() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const filledItems = gratitudeItems.filter(Boolean)
    if (filledItems.length === 0) return

    setGratitudeLoading(true)

    // Get AI second prompt
    let prompt = secondPrompt
    if (!prompt && filledItems.length >= 1) {
      try {
        const res = await fetch('/api/gratitude-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: filledItems }),
        })
        const data = await res.json()
        prompt = data.prompt || ''
        setSecondPrompt(prompt)
      } catch { /* skip */ }
    }

    await supabase.from('gratitude_entries').upsert({
      user_id: user.id,
      date: today,
      items: gratitudeItems,
      second_prompt: prompt,
      second_answer: secondAnswer,
    }, { onConflict: 'user_id,date' })
    setGratitudeSaved(true)
    setGratitudeLoading(false)
  }

  async function submitEveningReflection(e: React.FormEvent) {
    e.preventDefault()
    setReflectionLoading(true)
    try {
      const res = await fetch('/api/evening-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reflectionForm, date: today }),
      })
      const data = await res.json()
      setReflectionResponse(data.coach_response)
    } catch { /* skip */ }
    setReflectionLoading(false)
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/mind-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setChatMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch {
      setChatMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    }
    setChatLoading(false)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-8">
        <h1 className="text-2xl font-bold">Mind</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Stoic practice & reflection</p>
      </div>

      <Tabs defaultValue="stoic">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stoic" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />Stoic</TabsTrigger>
          <TabsTrigger value="gratitude" className="text-xs"><Heart className="h-3 w-3 mr-1" />Thanks</TabsTrigger>
          <TabsTrigger value="evening" className="text-xs"><Moon className="h-3 w-3 mr-1" />Evening</TabsTrigger>
          <TabsTrigger value="coach" className="text-xs"><MessageCircle className="h-3 w-3 mr-1" />Coach</TabsTrigger>
        </TabsList>

        {/* Stoic Reading */}
        <TabsContent value="stoic" className="space-y-3 mt-4">
          {stoicLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : stoicEntry?.reflection ? (
            <Card>
              <CardContent className="p-5 space-y-4">
                <div>
                  <span className="text-xs text-primary/70 font-medium uppercase tracking-wider">
                    {stoicEntry.theme}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{stoicEntry.reflection}</p>
                <div className="border-l-2 border-primary/30 pl-3">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Practice</p>
                  <p className="text-sm italic">{stoicEntry.practice}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant={stoicEntry.read ? 'secondary' : 'default'}
                    size="sm"
                    className="flex-1"
                    onClick={markStoicRead}
                  >
                    {stoicEntry.read ? 'Read ✓' : 'Mark Read'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleStoicSaved}
                  >
                    <Bookmark className={cn('h-4 w-4', stoicEntry.saved && 'fill-current')} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Failed to load today&apos;s reflection.</p>
          )}
        </TabsContent>

        {/* Gratitude */}
        <TabsContent value="gratitude" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">What are you grateful for today?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {gratitudeItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm w-4">{i + 1}.</span>
                  <Input
                    placeholder={`Grateful for...`}
                    value={item}
                    onChange={e => {
                      const updated = [...gratitudeItems]
                      updated[i] = e.target.value
                      setGratitudeItems(updated)
                    }}
                    disabled={gratitudeSaved}
                  />
                </div>
              ))}
              {!gratitudeSaved && (
                <Button className="w-full" onClick={saveGratitude} disabled={gratitudeLoading}>
                  {gratitudeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Get Prompt'}
                </Button>
              )}
            </CardContent>
          </Card>

          {secondPrompt && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">{secondPrompt}</p>
                {answerSaved ? (
                  <p className="text-sm text-primary">Answer saved ✓</p>
                ) : (
                  <>
                    <Textarea
                      placeholder="Your thoughts..."
                      value={secondAnswer}
                      onChange={e => { setSecondAnswer(e.target.value); secondAnswerRef.current = e.target.value }}
                      rows={3}
                    />
                    <Button
                      size="sm"
                      disabled={answerSaving || !secondAnswer.trim()}
                      onClick={async () => {
                        setAnswerSaving(true)
                        const { data: { user } } = await supabase.auth.getUser()
                        if (!user) { setAnswerSaving(false); return }
                        const { error } = await supabase.from('gratitude_entries').upsert({
                          user_id: user.id,
                          date: today,
                          items: gratitudeItems,
                          second_prompt: secondPrompt,
                          second_answer: secondAnswerRef.current,
                        }, { onConflict: 'user_id,date' })
                        setAnswerSaving(false)
                        if (!error) setAnswerSaved(true)
                      }}
                    >
                      {answerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Answer'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Evening Reflection */}
        <TabsContent value="evening" className="space-y-3 mt-4">
          {!showEvening && !reflectionResponse && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Evening reflection unlocks after 7pm.
                </p>
              </CardContent>
            </Card>
          )}
          {(showEvening || reflectionResponse) && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <form onSubmit={submitEveningReflection} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">What went well today?</label>
                    <Textarea
                      placeholder="Three things that went well..."
                      value={reflectionForm.went_well}
                      onChange={e => setReflectionForm(f => ({ ...f, went_well: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">What would you do differently?</label>
                    <Textarea
                      placeholder="One thing to improve..."
                      value={reflectionForm.do_differently}
                      onChange={e => setReflectionForm(f => ({ ...f, do_differently: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  {!reflectionResponse && (
                    <Button type="submit" className="w-full" disabled={reflectionLoading}>
                      {reflectionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reflect'}
                    </Button>
                  )}
                </form>
                {reflectionResponse && (
                  <div className="border-l-2 border-primary/30 pl-3 pt-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      Stoic Closing Thought
                    </p>
                    <p className="text-sm leading-relaxed italic">{reflectionResponse}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Mind Coach */}
        <TabsContent value="coach" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center pt-8">
                    What&apos;s on your mind? Your Stoic coach is here.
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-sm rounded-xl px-3 py-2 max-w-[85%]',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="bg-muted rounded-xl px-3 py-2 w-12">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Ask your Stoic coach..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                />
                <Button size="icon" onClick={sendChat} disabled={chatLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
