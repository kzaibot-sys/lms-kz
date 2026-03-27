'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Award, User, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/courses', label: 'Курсы', icon: BookOpen },
  { href: '/certificates', label: 'Серт.', icon: Award },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
