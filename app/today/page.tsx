'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { Dumbbell, Heart, Utensils, Brain, CheckSquare, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  label: string
  done: boolean
  href: string
  icon: React.ReactNode
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })
}

export default function TodayPage() {
  const [userName, setUserName] = useState('')
  const [intention, setIntention] = useState('')
  const [intentionLoading, setIntentionLoading] = useState(true)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setChecklist([
          { label: 'Log sleep', done: false, href: '/wellness', icon: <Heart className="h-4 w-4" /> },
          { label: 'Supplements', done: false, href: '/wellness', icon: <Heart className="h-4 w-4" /> },
          { label: 'Stoic reading', done: false, href: '/mind', icon: <Brain className="h-4 w-4" /> },
          { label: 'Gratitude', done: false, href: '/mind', icon: <Brain className="h-4 w-4" /> },
          { label: 'Workout', done: false, href: '/move', icon: <Dumbbell className="h-4 w-4" /> },
          { label: 'Log meals', done: false, href: '/eat', icon: <Utensils className="h-4 w-4" /> },
          { label: 'Habits', done: false, href: '/habits', icon: <CheckSquare className="h-4 w-4" /> },
        ])
        setLoading(false)
        return
      }

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()
      setUserName(profile?.name || '')

      // Load checklist data in parallel
      const [sleepLog, supplementLog, stoicEntry, gratitudeEntry, workoutLog, habitLogs, habits, meals] = await Promise.all([
        supabase.from('sleep_logs').select('id').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('supplement_logs').select('items').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('stoic_entries').select('read').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('gratitude_entries').select('id').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('workout_logs').select('id').eq('user_id', user.id).eq('date', today).single(),
        supabase.from('habit_logs').select('completed').eq('user_id', user.id).eq('date', today).eq('completed', true),
        supabase.from('habits').select('id').eq('user_id', user.id).eq('active', true),
        supabase.from('meals').select('id').eq('user_id', user.id).eq('date', today).limit(1),
      ])

      const supplementItems = (supplementLog.data?.items as Array<{ checked: boolean }>) || []
      const supplementDone = supplementItems.length > 0 && supplementItems.every(s => s.checked)
      const habitsDone = (habits.data?.length || 0) > 0 &&
        (habitLogs.data?.length || 0) >= (habits.data?.length || 1)

      setChecklist([
        { label: 'Log sleep', done: !!sleepLog.data, href: '/wellness', icon: <Heart className="h-4 w-4" /> },
        { label: 'Supplements', done: supplementDone, href: '/wellness', icon: <Heart className="h-4 w-4" /> },
        { label: 'Stoic reading', done: !!stoicEntry.data?.read, href: '/mind', icon: <Brain className="h-4 w-4" /> },
        { label: 'Gratitude', done: !!gratitudeEntry.data, href: '/mind', icon: <Brain className="h-4 w-4" /> },
        { label: 'Workout', done: !!workoutLog.data, href: '/move', icon: <Dumbbell className="h-4 w-4" /> },
        { label: 'Log meals', done: (meals.data?.length || 0) > 0, href: '/eat', icon: <Utensils className="h-4 w-4" /> },
        { label: 'Habits', done: habitsDone, href: '/habits', icon: <CheckSquare className="h-4 w-4" /> },
      ])
      setLoading(false)
    }
    load()
  }, [today])

  useEffect(() => {
    async function loadIntention() {
      try {
        const res = await fetch('/api/daily-intention')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setIntention(data.intention || 'Endure what you must, do what you can.')
      } catch {
        setIntention('Endure what you must, do what you can.')
      }
      setIntentionLoading(false)
    }
    loadIntention()
  }, [])

  const completedCount = checklist.filter(i => i.done).length
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-8">
        <p className="text-muted-foreground text-sm">{formatDate()}</p>
        <h1 className="text-2xl font-bold mt-0.5">
          {getGreeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h1>
      </div>

      {/* Daily Intention */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-xs text-primary/70 font-medium uppercase tracking-wider mb-1.5">Today&apos;s Intention</p>
          {intentionLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Generating...</span>
            </div>
          ) : (
            <p className="text-sm font-medium leading-relaxed italic">&ldquo;{intention}&rdquo;</p>
          )}
        </CardContent>
      </Card>

      {/* Progress Ring */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Daily Ritual</span>
            <span className="text-sm text-muted-foreground">
              {loading ? '...' : `${completedCount}/${checklist.length}`}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Checklist */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">Checklist</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          checklist.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className={cn(
                'transition-colors hover:bg-muted/50',
                item.done && 'opacity-60'
              )}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    item.done ? 'border-primary bg-primary' : 'border-muted-foreground'
                  )}>
                    {item.done && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-muted-foreground">{item.icon}</span>
                    <span className={cn('text-sm', item.done && 'line-through text-muted-foreground')}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
