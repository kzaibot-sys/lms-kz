'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, Award, User, LogOut, GraduationCap, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudentSidebarProps {
  isAdmin?: boolean
}

const studentNavItems = [
  { href: '/courses', label: 'Курсы', icon: BookOpen },
  { href: '/certificates', label: 'Сертификаты', icon: Award },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function StudentSidebar({ isAdmin = false }: StudentSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold">LMS Platform</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            Администратор
          </Link>
        )}
        {studentNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Выход
        </button>
      </div>
    </aside>
  )
}
