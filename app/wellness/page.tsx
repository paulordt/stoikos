'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Moon, Sun, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Json } from '@/lib/supabase/types'

interface Supplement { name: string; checked: boolean }
interface SleepLog {
  id: string
  date: string
  bedtime: string | null
  wake_time: string | null
  quality: number | null
  notes: string | null
  duration_hours: number | null
  source: string
}

export default function WellnessPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [supplementStreak, setSupplementStreak] = useState(0)
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([])
  const [sleepForm, setSleepForm] = useState({ bedtime: '', wake_time: '', quality: 3, notes: '' })
  const [sleepLoading, setSleepLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, suppLogRes, sleepRes] = await Promise.all([
      supabase.from('profiles').select('supplements').eq('user_id', user.id).single(),
      supabase.from('supplement_logs').select('items').eq('user_id', user.id).eq('date', today).single(),
      supabase.from('sleep_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(7),
    ])

    const profileSupps = (profileRes.data?.supplements as unknown as Supplement[]) || []
    const todaySupps = (suppLogRes.data?.items as unknown as Supplement[]) || null

    if (todaySupps) {
      setSupplements(todaySupps)
    } else {
      setSupplements(profileSupps.map(s => ({ ...s, checked: false })))
    }

    setSleepLogs(sleepRes.data as SleepLog[] || [])
    setLoading(false)
  }

  async function toggleSupplement(index: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updated = supplements.map((s, i) => i === index ? { ...s, checked: !s.checked } : s)
    setSupplements(updated)

    await supabase.from('supplement_logs').upsert({
      user_id: user.id,
      date: today,
      items: updated as unknown as Json,
    }, { onConflict: 'user_id,date' })
  }

  async function logSleep(e: React.FormEvent) {
    e.preventDefault()
    setSleepLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const bedtime = sleepForm.bedtime ? new Date(`${today}T${sleepForm.bedtime}:00`).toISOString() : null
    const wakeTime = sleepForm.wake_time ? new Date(`${today}T${sleepForm.wake_time}:00`).toISOString() : null

    let duration = null
    if (bedtime && wakeTime) {
      const diff = new Date(wakeTime).getTime() - new Date(bedtime).getTime()
      duration = diff / 3600000
      if (duration < 0) duration += 24
    }

    const { data, error } = await supabase.from('sleep_logs').upsert({
      user_id: user.id,
      date: today,
      bedtime,
      wake_time: wakeTime,
      quality: sleepForm.quality,
      notes: sleepForm.notes || null,
      duration_hours: duration,
      source: 'manual',
    }, { onConflict: 'user_id,date' }).select().single()
    if (error) console.error('Sleep log error:', error.message)

    if (data) {
      setSleepLogs(prev => {
        const filtered = prev.filter(l => l.date !== today)
        return [data as SleepLog, ...filtered].slice(0, 7)
      })
    }
    setSleepLoading(false)
  }

  const hour = new Date().getHours()
  const showSupplementReminder = hour >= 21

  return (
    <div className="p-4 space-y-6">
      <div className="pt-8">
        <h1 className="text-2xl font-bold">Wellness</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Sleep & supplements</p>
      </div>

      {/* Supplements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Supplements</CardTitle>
            {showSupplementReminder && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                9pm reminder
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : supplements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add supplements in Settings to track them here.</p>
          ) : (
            supplements.map((supp, i) => (
              <div key={i} className="flex items-center gap-3">
                <Checkbox
                  id={`supp-${i}`}
                  checked={supp.checked}
                  onCheckedChange={() => toggleSupplement(i)}
                />
                <label
                  htmlFor={`supp-${i}`}
                  className={cn('text-sm cursor-pointer', supp.checked && 'line-through text-muted-foreground')}
                >
                  {supp.name}
                </label>
              </div>
            ))
          )}
          {supplements.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              {supplements.filter(s => s.checked).length}/{supplements.length} taken
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sleep Log Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4" /> Log Sleep
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={logSleep} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bedtime" className="text-xs">Bedtime</Label>
                <Input
                  id="bedtime"
                  type="time"
                  value={sleepForm.bedtime}
                  onChange={e => setSleepForm(f => ({ ...f, bedtime: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wake" className="text-xs">Wake time</Label>
                <Input
                  id="wake"
                  type="time"
                  value={sleepForm.wake_time}
                  onChange={e => setSleepForm(f => ({ ...f, wake_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quality</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSleepForm(f => ({ ...f, quality: q }))}
                    className={cn(
                      'flex-1 py-1.5 rounded text-sm transition-colors',
                      sleepForm.quality === q
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. woke up twice..."
                value={sleepForm.notes}
                onChange={e => setSleepForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={sleepLoading}>
              {sleepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Sleep Log'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 7-Day Sleep Chart */}
      {sleepLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="h-4 w-4" /> Last 7 Nights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-20">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date()
                d.setDate(d.getDate() - (6 - i))
                const dateStr = d.toISOString().split('T')[0]
                const log = sleepLogs.find(l => l.date === dateStr)
                const height = log?.duration_hours
                  ? Math.min(100, (log.duration_hours / 10) * 100)
                  : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm bg-primary/20 relative" style={{ height: '60px' }}>
                      <div
                        className="absolute bottom-0 w-full rounded-t-sm bg-primary transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">
                      {d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 space-y-2">
              {sleepLogs.slice(0, 1).map(log => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last night</span>
                  <div className="flex items-center gap-3">
                    {log.duration_hours && (
                      <span>{log.duration_hours.toFixed(1)}h</span>
                    )}
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={cn(
                            'h-3 w-3',
                            s <= (log.quality || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
