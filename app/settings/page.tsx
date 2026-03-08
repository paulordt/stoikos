'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, Trash2, LogOut } from 'lucide-react'
import type { Json } from '@/lib/supabase/types'

interface ProfileForm {
  name: string
  weight_kg: string
  height_cm: string
  goal: string
  calories_target: string
  protein_target: string
  carbs_target: string
  fat_target: string
}

interface Supplement { name: string }
interface Habit {
  id?: string
  name: string
  category: string
  note: string
  frequency: { type: string }
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Exercise { name: string; sets: number; reps: string; weight?: string }
interface RoutineForm {
  id?: string
  name: string
  exercises: Exercise[]
  weekly_schedule: Record<string, string>
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileForm>({
    name: '', weight_kg: '', height_cm: '', goal: '',
    calories_target: '2000', protein_target: '150', carbs_target: '200', fat_target: '70',
  })
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [newSupp, setNewSupp] = useState('')
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabit, setNewHabit] = useState<Habit>({ name: '', category: '', note: '', frequency: { type: 'daily' } })
  const [routines, setRoutines] = useState<RoutineForm[]>([])
  const [newRoutine, setNewRoutine] = useState<RoutineForm>({ name: '', exercises: [], weekly_schedule: {} })
  const [newExercise, setNewExercise] = useState<Exercise>({ name: '', sets: 3, reps: '10' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [profileRes, habitsRes, routinesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
      supabase.from('routines').select('*').eq('user_id', user.id),
    ])

    if (profileRes.data) {
      const p = profileRes.data
      setProfile({
        name: p.name || '',
        weight_kg: String(p.weight_kg || ''),
        height_cm: String(p.height_cm || ''),
        goal: p.goal || '',
        calories_target: String(p.calories_target || 2000),
        protein_target: String(p.protein_target || 150),
        carbs_target: String(p.carbs_target || 200),
        fat_target: String(p.fat_target || 70),
      })
      setSupplements((p.supplements as unknown as Supplement[]) || [])
    }

    setHabits((habitsRes.data || []).map(h => ({
      id: h.id,
      name: h.name,
      category: h.category || '',
      note: h.note || '',
      frequency: (h.frequency as { type: string }) || { type: 'daily' },
    })))

    setRoutines((routinesRes.data || []).map(r => ({
      id: r.id,
      name: r.name,
      exercises: (r.exercises as unknown as Exercise[]) || [],
      weekly_schedule: (r.weekly_schedule as unknown as Record<string, string>) || {},
    })))

    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({
      user_id: user.id,
      name: profile.name || null,
      weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
      height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
      goal: profile.goal || null,
      calories_target: parseInt(profile.calories_target) || 2000,
      protein_target: parseInt(profile.protein_target) || 150,
      carbs_target: parseInt(profile.carbs_target) || 200,
      fat_target: parseInt(profile.fat_target) || 70,
      supplements: supplements as unknown as Json,
    }, { onConflict: 'user_id' })
    setSaving(false)
  }

  async function addSupplement() {
    if (!newSupp.trim()) return
    const updated = [...supplements, { name: newSupp.trim() }]
    setSupplements(updated)
    setNewSupp('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ user_id: user.id, supplements: updated as unknown as Json }, { onConflict: 'user_id' })
  }

  async function removeSupplement(index: number) {
    const updated = supplements.filter((_, i) => i !== index)
    setSupplements(updated)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ user_id: user.id, supplements: updated as unknown as Json }, { onConflict: 'user_id' })
  }

  async function addHabit() {
    if (!newHabit.name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('habits').insert({
      user_id: user.id,
      name: newHabit.name,
      category: newHabit.category || null,
      note: newHabit.note || null,
      frequency: newHabit.frequency as unknown as Json,
      active: true,
    }).select().single()
    if (data) setHabits(prev => [...prev, { ...newHabit, id: data.id }])
    setNewHabit({ name: '', category: '', note: '', frequency: { type: 'daily' } })
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').update({ active: false }).eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
  }

  async function saveRoutine() {
    if (!newRoutine.name.trim() || newRoutine.exercises.length === 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const routineData = {
      user_id: user.id,
      name: newRoutine.name,
      exercises: newRoutine.exercises as unknown as Json,
      weekly_schedule: newRoutine.weekly_schedule as unknown as Json,
    }

    if (newRoutine.id) {
      // Fix any remaining 'new' placeholder values in schedule to use the real ID
      const fixedSchedule: Record<string, string> = {}
      for (const [day, val] of Object.entries(newRoutine.weekly_schedule)) {
        fixedSchedule[day] = val === 'new' ? newRoutine.id : val
      }
      await supabase.from('routines').update({ ...routineData, weekly_schedule: fixedSchedule as unknown as Json }).eq('id', newRoutine.id)
      setRoutines(prev => prev.map(r => r.id === newRoutine.id ? { ...newRoutine, weekly_schedule: fixedSchedule } : r))
    } else {
      const { data } = await supabase.from('routines').insert(routineData).select().single()
      if (data) {
        // Replace 'new' placeholders with the real routine ID
        const fixedSchedule: Record<string, string> = {}
        for (const day of Object.keys(newRoutine.weekly_schedule)) {
          fixedSchedule[day] = data.id
        }
        if (Object.keys(fixedSchedule).length > 0) {
          await supabase.from('routines').update({ weekly_schedule: fixedSchedule as unknown as Json }).eq('id', data.id)
        }
        setRoutines(prev => [...prev, { ...newRoutine, id: data.id, weekly_schedule: fixedSchedule }])
      }
    }
    setNewRoutine({ name: '', exercises: [], weekly_schedule: {} })
    setNewExercise({ name: '', sets: 3, reps: '10' })
  }

  async function deleteRoutine(id: string) {
    await supabase.from('routines').delete().eq('id', id)
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-5">
      <div className="pt-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Profile & preferences</p>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground gap-1.5">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="supplements" className="text-xs">Supps</TabsTrigger>
          <TabsTrigger value="habits" className="text-xs">Habits</TabsTrigger>
          <TabsTrigger value="routines" className="text-xs">Routines</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {[
                { key: 'name', label: 'Name', placeholder: 'Your name' },
                { key: 'weight_kg', label: 'Weight (kg)', placeholder: '75', type: 'number' },
                { key: 'height_cm', label: 'Height (cm)', placeholder: '175', type: 'number' },
                { key: 'goal', label: 'Goal', placeholder: 'e.g. Build muscle, lose fat' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type={type || 'text'}
                    placeholder={placeholder}
                    value={profile[key as keyof ProfileForm]}
                    onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Daily Macro Goals</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { key: 'calories_target', label: 'Calories (kcal)' },
                { key: 'protein_target', label: 'Protein (g)' },
                { key: 'carbs_target', label: 'Carbs (g)' },
                { key: 'fat_target', label: 'Fat (g)' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    value={profile[key as keyof ProfileForm]}
                    onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={saveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Profile'}
          </Button>
        </TabsContent>

        {/* Supplements */}
        <TabsContent value="supplements" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {supplements.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{s.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSupplement(i)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add supplement..."
                  value={newSupp}
                  onChange={e => setNewSupp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSupplement()}
                />
                <Button size="icon" onClick={addSupplement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Habits */}
        <TabsContent value="habits" className="space-y-4 mt-4">
          <div className="space-y-2">
            {habits.map(habit => (
              <Card key={habit.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{habit.name}</p>
                    {habit.category && <p className="text-xs text-muted-foreground">{habit.category}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => habit.id && deleteHabit(habit.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add Habit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Habit name</Label>
                <Input
                  placeholder="e.g. Morning meditation"
                  value={newHabit.name}
                  onChange={e => setNewHabit(h => ({ ...h, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category (optional)</Label>
                <Input
                  placeholder="e.g. Health, Mind, Fitness"
                  value={newHabit.category}
                  onChange={e => setNewHabit(h => ({ ...h, category: e.target.value }))}
                />
              </div>
              <Button className="w-full" onClick={addHabit}>
                <Plus className="h-4 w-4 mr-2" /> Add Habit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routines */}
        <TabsContent value="routines" className="space-y-4 mt-4">
          <div className="space-y-2">
            {routines.map(r => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.exercises.length} exercises</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7"
                      onClick={() => setNewRoutine({ ...r })}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => r.id && deleteRoutine(r.id)}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{newRoutine.id ? 'Edit Routine' : 'New Routine'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Routine name</Label>
                <Input
                  placeholder="e.g. Push Day, Full Body"
                  value={newRoutine.name}
                  onChange={e => setNewRoutine(r => ({ ...r, name: e.target.value }))}
                />
              </div>

              {/* Schedule */}
              <div className="space-y-1">
                <Label className="text-xs">Schedule (days this routine runs)</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS.map(day => {
                    const active = newRoutine.weekly_schedule[day]
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`px-2.5 py-1 rounded text-xs transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                        onClick={() => {
                          setNewRoutine(r => {
                            const sched = { ...r.weekly_schedule }
                            if (sched[day]) { delete sched[day] } else { sched[day] = r.id || 'new' }
                            return { ...r, weekly_schedule: sched }
                          })
                        }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Exercises */}
              <div className="space-y-2">
                <Label className="text-xs">Exercises</Label>
                {newRoutine.exercises.map((ex, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex-1 truncate">{ex.name}</span>
                    <span className="text-xs text-muted-foreground">{ex.sets}×{ex.reps}</span>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => setNewRoutine(r => ({ ...r, exercises: r.exercises.filter((_, j) => j !== i) }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-1.5">
                  <Input
                    className="col-span-3"
                    placeholder="Exercise name"
                    value={newExercise.name}
                    onChange={e => setNewExercise(ex => ({ ...ex, name: e.target.value }))}
                  />
                  <Input
                    type="number"
                    placeholder="Sets"
                    value={newExercise.sets}
                    onChange={e => setNewExercise(ex => ({ ...ex, sets: parseInt(e.target.value) || 3 }))}
                  />
                  <Input
                    placeholder="Reps"
                    value={newExercise.reps}
                    onChange={e => setNewExercise(ex => ({ ...ex, reps: e.target.value }))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!newExercise.name.trim()) return
                      setNewRoutine(r => ({ ...r, exercises: [...r.exercises, { ...newExercise }] }))
                      setNewExercise({ name: '', sets: 3, reps: '10' })
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={saveRoutine} disabled={!newRoutine.name || newRoutine.exercises.length === 0}>
                {newRoutine.id ? 'Update Routine' : 'Save Routine'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Webhook URL */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Whoop Webhook URL</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
            {typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'}/api/whoop/webhook
          </code>
        </CardContent>
      </Card>
    </div>
  )
}
