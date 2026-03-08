'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Flame, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Habit {
  id: string
  name: string
  category: string | null
  frequency: { type: string; days?: string[] }
}

interface HabitWithLog extends Habit {
  completedToday: boolean
  currentStreak: number
  longestStreak: number
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isScheduledToday(habit: Habit): boolean {
  const freq = habit.frequency
  if (freq.type === 'daily') return true
  if (freq.type === 'weekly' && freq.days) {
    const today = DAY_NAMES[new Date().getDay()]
    return freq.days.includes(today)
  }
  return true
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [loading, setLoading] = useState(true)
  const [weeklyReview, setWeeklyReview] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [gridData, setGridData] = useState<Map<string, Set<string>>>(new Map())
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const isSunday = new Date().getDay() === 0

  useEffect(() => {
    loadHabits()
  }, [])

  async function loadHabits() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
      supabase.from('habit_logs')
        .select('habit_id, date, completed')
        .eq('user_id', user.id)
        .gte('date', (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0] })())
        .eq('completed', true),
    ])

    const allLogs = logsRes.data || []
    const gridMap = new Map<string, Set<string>>()

    const habitsWithLogs: HabitWithLog[] = (habitsRes.data || []).map(habit => {
      const habitLogs = allLogs.filter(l => l.habit_id === habit.id)
      const completedDates = new Set(habitLogs.map(l => l.date))

      // Build grid data
      completedDates.forEach(date => {
        if (!gridMap.has(habit.id)) gridMap.set(habit.id, new Set())
        gridMap.get(habit.id)!.add(date)
      })

      // Calculate streaks
      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0
      const checkDate = new Date()

      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        if (completedDates.has(dateStr)) {
          tempStreak++
          if (i === 0 || currentStreak > 0) currentStreak = tempStreak
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          if (i > 0) currentStreak = Math.min(currentStreak, tempStreak)
          tempStreak = 0
        }
        checkDate.setDate(checkDate.getDate() - 1)
      }

      return {
        ...habit,
        frequency: habit.frequency as { type: string; days?: string[] },
        completedToday: completedDates.has(today),
        currentStreak: currentStreak || 0,
        longestStreak,
      }
    })

    setHabits(habitsWithLogs)
    setGridData(gridMap)
    setLoading(false)

    if (isSunday) loadWeeklyReview()
  }

  async function toggleHabit(habit: HabitWithLog) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newCompleted = !habit.completedToday
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, completedToday: newCompleted } : h))

    await supabase.from('habit_logs').upsert({
      user_id: user.id,
      habit_id: habit.id,
      date: today,
      completed: newCompleted,
    }, { onConflict: 'user_id,habit_id,date' })
  }

  async function loadWeeklyReview() {
    setReviewLoading(true)
    try {
      const res = await fetch('/api/habit-review')
      const data = await res.json()
      setWeeklyReview(data.review)
    } catch {
      setWeeklyReview('')
    }
    setReviewLoading(false)
  }

  const scheduledToday = habits.filter(isScheduledToday)
  const completedToday = scheduledToday.filter(h => h.completedToday).length

  // Build 7-day grid dates
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  return (
    <div className="p-4 space-y-6">
      <div className="pt-8">
        <h1 className="text-2xl font-bold">Habits</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {loading ? '...' : `${completedToday}/${scheduledToday.length} done today`}
        </p>
      </div>

      {/* Today's habits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : scheduledToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">No habits scheduled for today. Add some in Settings.</p>
          ) : (
            scheduledToday.map(habit => (
              <div key={habit.id} className="flex items-center gap-3">
                <Checkbox
                  id={habit.id}
                  checked={habit.completedToday}
                  onCheckedChange={() => toggleHabit(habit)}
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={habit.id}
                    className={cn(
                      'text-sm cursor-pointer block',
                      habit.completedToday && 'line-through text-muted-foreground'
                    )}
                  >
                    {habit.name}
                  </label>
                  {habit.category && (
                    <span className="text-xs text-muted-foreground">{habit.category}</span>
                  )}
                </div>
                {habit.currentStreak > 0 && (
                  <div className="flex items-center gap-1 text-xs text-orange-400">
                    <Flame className="h-3 w-3" />
                    <span>{habit.currentStreak}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Streaks */}
      {!loading && habits.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Streaks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {habits.slice(0, 5).map(habit => (
              <div key={habit.id} className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{habit.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-400" />
                    {habit.currentStreak} now
                  </span>
                  <span>{habit.longestStreak} best</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 7-day grid */}
      {!loading && habits.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex gap-1 mb-1 pl-24">
                {last7Days.map(date => (
                  <div key={date} className="flex-1 text-center text-[9px] text-muted-foreground">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}
                  </div>
                ))}
              </div>
              {habits.map(habit => (
                <div key={habit.id} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground w-24 truncate">{habit.name}</span>
                  {last7Days.map(date => {
                    const done = gridData.get(habit.id)?.has(date) || false
                    return (
                      <div
                        key={date}
                        className={cn(
                          'flex-1 h-5 rounded-sm',
                          done ? 'bg-primary' : 'bg-muted'
                        )}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sunday Review */}
      {isSunday && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weekly Stoic Review</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Reflecting on your week...</span>
              </div>
            ) : weeklyReview ? (
              <p className="text-sm leading-relaxed">{weeklyReview}</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
