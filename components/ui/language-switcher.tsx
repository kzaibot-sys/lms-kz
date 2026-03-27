'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface LanguageSwitcherProps {
  currentLocale?: string
  className?: string
}

export function LanguageSwitcher({ currentLocale = 'ru', className }: LanguageSwitcherProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const switchLocale = (locale: string) => {
    startTransition(async () => {
      await fetch('/api/profile/locale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      router.refresh()
    })
  }

  return (
    <div className={`flex items-center gap-1 rounded-lg bg-muted p-1 ${className ?? ''}`}>
      <button
        onClick={() => switchLocale('ru')}
        disabled={isPending}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          currentLocale === 'ru'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        RU
      </button>
      <button
        onClick={() => switchLocale('kz')}
        disabled={isPending}
        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          currentLocale === 'kz'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        KZ
      </button>
    </div>
  )
}
