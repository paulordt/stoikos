'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Dumbbell, CheckCircle, Timer, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Json } from '@/lib/supabase/types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Exercise {
  name: string
  sets: number
  reps: string
  weight?: string
  completed?: boolean
  logged_sets?: Array<{ reps: number; weight: number }>
}

interface Routine {
  id: string
  name: string
  weekly_schedule: Record<string, string>
  exercises: Exercise[]
}

export default function MovePage() {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [todayRoutine, setTodayRoutine] = useState<Routine | null>(null)
  const [activeSession, setActiveSession] = useState<Exercise[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [postWorkout, setPostWorkout] = useState('')
  const [postLoading, setPostLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [weekHistory, setWeekHistory] = useState<string[]>([])
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const todayDay = DAYS[new Date().getDay()]

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [routinesRes, workoutRes, historyRes] = await Promise.all([
      supabase.from('routines').select('*').eq('user_id', user.id),
      supabase.from('workout_logs').select('id, routine_id').eq('user_id', user.id).eq('date', today).single(),
      supabase.from('workout_logs').select('date').eq('user_id', user.id)
        .gte('date', (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0] })()),
    ])

    const allRoutines = (routinesRes.data || []).map(r => ({
      ...r,
      weekly_schedule: (r.weekly_schedule as Record<string, string>) || {},
      exercises: (r.exercises as unknown as Exercise[]) || [],
    }))
    setRoutines(allRoutines)
    setWeekHistory((historyRes.data || []).map(w => w.date))

    // Find today's routine
    const scheduled = allRoutines.find(r => r.weekly_schedule[todayDay] === r.id) ||
      allRoutines.find(r => Object.values(r.weekly_schedule).includes(r.id) && r.weekly_schedule[todayDay])

    // Try to find by day key directly
    let todayR: Routine | null = null
    for (const r of allRoutines) {
      if (r.weekly_schedule[todayDay]) {
        const targetId = r.weekly_schedule[todayDay]
        todayR = allRoutines.find(x => x.id === targetId) || null
        break
      }
    }
    if (!todayR && allRoutines.length > 0) todayR = allRoutines[0]
    setTodayRoutine(todayR)

    if (workoutRes.data) setSessionDone(true)
    setLoading(false)
  }

  function startSession() {
    if (!todayRoutine) return
    setActiveSession(todayRoutine.exercises.map(e => ({ ...e, completed: false })))
    setSessionActive(true)
    setStartTime(new Date())
  }

  async function finishSession() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !todayRoutine || !startTime) return

    const duration = Math.round((Date.now() - startTime.getTime()) / 60000)
    const completed = activeSession.filter(e => e.completed).length

    await supabase.from('workout_logs').insert({
      user_id: user.id,
      routine_id: todayRoutine.id,
      date: today,
      completed_exercises: activeSession as unknown as Json,
      duration_min: duration,
    })

    setSessionActive(false)
    setSessionDone(true)
    loadPostWorkout(todayRoutine.name, duration, completed)
  }

  async function loadPostWorkout(routineName: string, duration: number, exercisesCompleted: number) {
    setPostLoading(true)
    try {
      const res = await fetch('/api/post-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine_name: routineName, duration_min: duration, exercises_completed: exercisesCompleted }),
      })
      const data = await res.json()
      setPostWorkout(data.message)
    } catch { /* skip */ }
    setPostLoading(false)
  }

  function toggleExercise(index: number) {
    setActiveSession(prev => prev.map((e, i) => i === index ? { ...e, completed: !e.completed } : e))
  }

  const completedCount = activeSession.filter(e => e.completed).length
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  return (
    <div className="p-4 space-y-5">
      <div className="pt-8">
        <h1 className="text-2xl font-bold">Move</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}&apos;s training</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : routines.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No routines yet. Create one in Settings.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Session Done */}
          {sessionDone && (
            <Card className="border-green-500/30 bg-green-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-400">Workout complete!</p>
                  {postLoading ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs text-muted-foreground">Getting your message...</span>
                    </div>
                  ) : postWorkout && (
                    <p className="text-xs text-muted-foreground mt-1">{postWorkout}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Routine */}
          {todayRoutine && !sessionActive && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{todayRoutine.name}</CardTitle>
                  <span className="text-xs text-muted-foreground">{todayRoutine.exercises.length} exercises</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayRoutine.exercises.slice(0, 4).map((ex, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{ex.name}</span>
                    <span className="text-muted-foreground text-xs">{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
                {todayRoutine.exercises.length > 4 && (
                  <p className="text-xs text-muted-foreground">+{todayRoutine.exercises.length - 4} more</p>
                )}
                {!sessionDone && (
                  <Button className="w-full mt-3 gap-2" onClick={startSession}>
                    <Timer className="h-4 w-4" /> Start Session
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Session */}
          {sessionActive && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {todayRoutine?.name}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{activeSession.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSession.map((ex, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg transition-colors',
                      ex.completed && 'bg-muted'
                    )}
                  >
                    <Checkbox
                      checked={ex.completed || false}
                      onCheckedChange={() => toggleExercise(i)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', ex.completed && 'line-through text-muted-foreground')}>
                        {ex.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{ex.sets} sets × {ex.reps}</p>
                    </div>
                    {ex.weight && (
                      <span className="text-xs text-muted-foreground">{ex.weight}</span>
                    )}
                  </div>
                ))}
                <Button
                  className="w-full gap-2 mt-2"
                  onClick={finishSession}
                  disabled={completedCount === 0}
                >
                  <Trophy className="h-4 w-4" />
                  Finish Workout ({completedCount}/{activeSession.length})
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Weekly History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {last7Days.map(date => {
                  const day = new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)
                  const worked = weekHistory.includes(date) || (date === today && sessionDone)
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <div className={cn(
                        'w-full h-8 rounded flex items-center justify-center',
                        worked ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {worked && <CheckCircle className="h-4 w-4" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* All Routines */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">All Routines</h2>
            {routines.map(routine => (
              <Card key={routine.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{routine.name}</p>
                      <p className="text-xs text-muted-foreground">{routine.exercises.length} exercises</p>
                    </div>
                    <div className="flex gap-1">
                      {Object.entries(routine.weekly_schedule).map(([day]) => (
                        <span key={day} className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
