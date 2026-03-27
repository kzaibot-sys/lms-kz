'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { initTelegram, expandTelegramApp } from '@/lib/telegram/init'
import { TelegramNav } from '@/components/layout/TelegramNav'

export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ru'

  useEffect(() => {
    // Initialize Telegram Mini App SDK
    const isTg = initTelegram()
    if (isTg) {
      expandTelegramApp()
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Main content — leave room for bottom nav (56px) + safe area */}
      <main
        className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom))]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto max-w-2xl px-4 py-4">{children}</div>
      </main>

      {/* Bottom navigation */}
      <TelegramNav locale={locale} />
    </div>
  )
}
