'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  currentLocale: string
  className?: string
}

export function LanguageSwitcher({ currentLocale, className }: LanguageSwitcherProps) {
  const router = useRouter()

  const switchLocale = async (locale: string) => {
    await fetch('/api/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    })
    router.refresh()
  }

  return (
    <div className={cn('flex items-center rounded-md border border-input overflow-hidden', className)}>
      <button
        onClick={() => switchLocale('ru')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium transition-colors',
          currentLocale === 'ru'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        )}
      >
        RU
      </button>
      <button
        onClick={() => switchLocale('kz')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium transition-colors',
          currentLocale === 'kz'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        )}
      >
        KZ
      </button>
    </div>
  )
}
