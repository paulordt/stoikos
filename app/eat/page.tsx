'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Camera, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Meal {
  id: string
  meal_type: string
  name: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  created_at: string
}

interface MacroGoals {
  calories_target: number
  protein_target: number
  carbs_target: number
  fat_target: number
}

const defaultForm = {
  meal_type: 'lunch' as const,
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
}

export default function EatPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [goals, setGoals] = useState<MacroGoals>({ calories_target: 2000, protein_target: 150, carbs_target: 200, fat_target: 70 })
  const [form, setForm] = useState(defaultForm)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [mealsRes, profileRes] = await Promise.all([
      supabase.from('meals').select('*').eq('user_id', user.id).eq('date', today).order('created_at'),
      supabase.from('profiles').select('calories_target, protein_target, carbs_target, fat_target').eq('user_id', user.id).single(),
    ])
    setMeals((mealsRes.data as Meal[]) || [])
    if (profileRes.data) setGoals(profileRes.data as MacroGoals)
    setLoading(false)
  }

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0),
    fat: acc.fat + (m.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  async function saveMeal(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase.from('meals').insert({
      user_id: user.id,
      date: today,
      meal_type: form.meal_type,
      name: form.name,
      calories: form.calories ? parseInt(form.calories) : null,
      protein: form.protein ? parseFloat(form.protein) : null,
      carbs: form.carbs ? parseFloat(form.carbs) : null,
      fat: form.fat ? parseFloat(form.fat) : null,
    }).select().single()

    if (data) setMeals(prev => [...prev, data as Meal])
    setForm(defaultForm)
    setShowForm(false)
    setSaving(false)
  }

  async function deleteMeal(id: string) {
    await supabase.from('meals').delete().eq('id', id)
    setMeals(prev => prev.filter(m => m.id !== id))
  }

  async function analyzePhoto(file: File) {
    setAnalyzing(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await fetch('/api/analyze-food', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.error) {
        setForm({
          meal_type: (data.meal_type || 'lunch') as typeof defaultForm['meal_type'],
          name: data.name || '',
          calories: String(data.calories || ''),
          protein: String(data.protein || ''),
          carbs: String(data.carbs || ''),
          fat: String(data.fat || ''),
        })
        setShowForm(true)
      }
    } catch { /* skip */ }
    setAnalyzing(false)
  }

  const macroItems = [
    { label: 'Calories', value: totals.calories, goal: goals.calories_target, unit: 'kcal', color: 'bg-orange-400' },
    { label: 'Protein', value: Math.round(totals.protein), goal: goals.protein_target, unit: 'g', color: 'bg-blue-400' },
    { label: 'Carbs', value: Math.round(totals.carbs), goal: goals.carbs_target, unit: 'g', color: 'bg-green-400' },
    { label: 'Fat', value: Math.round(totals.fat), goal: goals.fat_target, unit: 'g', color: 'bg-yellow-400' },
  ]

  return (
    <div className="p-4 space-y-5">
      <div className="pt-8">
        <h1 className="text-2xl font-bold">Eat</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Nutrition tracking</p>
      </div>

      {/* Macro Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today&apos;s Macros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {macroItems.map(({ label, value, goal, unit, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span>{value} / {goal} {unit}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', color)}
                  style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1 gap-2" onClick={() => setShowForm(s => !s)}>
          <Plus className="h-4 w-4" /> Add Meal
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Photo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => e.target.files?.[0] && analyzePhoto(e.target.files[0])}
        />
      </div>

      {/* Meal Form */}
      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={saveMeal} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Meal type</Label>
                <Select
                  value={form.meal_type}
                  onValueChange={v => setForm(f => ({ ...f, meal_type: v as typeof defaultForm['meal_type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Food name</Label>
                <Input
                  placeholder="e.g. Chicken breast with rice"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'calories', label: 'Calories (kcal)' },
                  { key: 'protein', label: 'Protein (g)' },
                  { key: 'carbs', label: 'Carbs (g)' },
                  { key: 'fat', label: 'Fat (g)' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Meal List */}
      {!loading && meals.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1">Meals</h2>
          {meals.map(meal => (
            <Card key={meal.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{meal.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {meal.meal_type} · {new Date(meal.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {(meal.calories || meal.protein) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {meal.calories && `${meal.calories} kcal`}
                      {meal.protein && ` · ${meal.protein}g protein`}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => deleteMeal(meal.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && meals.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">No meals logged yet. Tap &quot;Add Meal&quot; to start.</p>
      )}
    </div>
  )
}
