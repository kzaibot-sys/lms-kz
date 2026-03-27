'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Award,
  LogOut,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', label: 'Панель управления', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Курсы', icon: BookOpen, exact: false },
  { href: '/admin/students', label: 'Студенты', icon: Users, exact: false },
  { href: '/admin/certificates', label: 'Сертификаты', icon: Award, exact: false },
]

interface AdminSidebarProps {
  adminName: string
}

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href) && !(item.href === '/admin' && pathname !== '/admin')
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white dark:bg-slate-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-5">
        <GraduationCap className="h-7 w-7 text-primary" />
        <div>
          <div className="text-sm font-bold leading-tight">LMS Platform</div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <ShieldCheck className="h-3 w-3" />
            <span>Администратор</span>
          </div>
        </div>
      </div>

      {/* Admin info */}
      <div className="border-b border-slate-700 px-5 py-3">
        <p className="text-xs text-slate-400">Вы вошли как</p>
        <p className="text-sm font-medium text-slate-100">{adminName}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Выход
        </button>
      </div>
    </aside>
  )
}
