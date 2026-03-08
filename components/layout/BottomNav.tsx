'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Dumbbell, Heart, Utensils, Brain, CheckSquare, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/today', icon: Sun, label: 'Today' },
  { href: '/move', icon: Dumbbell, label: 'Move' },
  { href: '/wellness', icon: Heart, label: 'Wellness' },
  { href: '/eat', icon: Utensils, label: 'Eat' },
  { href: '/mind', icon: Brain, label: 'Mind' },
  { href: '/habits', icon: CheckSquare, label: 'Habits' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'fill-current opacity-80')} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <Link
          href="/settings"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors',
            pathname.startsWith('/settings')
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Settings className="h-5 w-5" strokeWidth={pathname.startsWith('/settings') ? 2.5 : 1.75} />
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </div>
    </nav>
  )
}
