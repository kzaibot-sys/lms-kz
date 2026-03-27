'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Award, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TelegramNavProps {
  locale: string
}

export function TelegramNav({ locale }: TelegramNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: `/${locale}/tg/courses`,
      label: 'Курсы',
      icon: BookOpen,
      match: '/tg/courses',
    },
    {
      href: `/${locale}/tg/certificates`,
      label: 'Сертификаты',
      icon: Award,
      match: '/tg/certificates',
    },
    {
      href: `/${locale}/tg/profile`,
      label: 'Профиль',
      icon: User,
      match: '/tg/profile',
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <div className="flex items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.includes(item.match)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5',
                'min-h-[56px] px-2 py-2 text-xs font-medium transition-colors',
                'active:scale-95 touch-manipulation',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span className="leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}
      </div>
      {/* Safe area spacer for devices with home indicator */}
      <div className="h-safe-area-inset-bottom" style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}
