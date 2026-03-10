'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AuthConfirmPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('Link expired or already used. Please request a new one.')
        } else {
          router.push('/today')
        }
      })
      return
    }

    // No code — check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/today')
      } else {
        setError('Invalid link. Please request a new one.')
      }
    })
  }, [router])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-primary underline"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}
