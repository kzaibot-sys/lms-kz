'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  locale: string
}

export function LogoutButton({ locale }: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push(`/${locale}/login`)
  }

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-destructive transition-colors active:bg-destructive/10"
    >
      <LogOut className="h-4 w-4" />
      Выйти из аккаунта
    </button>
  )
}
