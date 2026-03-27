'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, Eye, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface StudentRow {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  status: 'active' | 'blocked'
  role: string
  created_at: string
}

interface AdminStudentsTableProps {
  students: StudentRow[]
  totalPages: number
  currentPage: number
  initialSearch: string
  initialStatus: string
}

export function AdminStudentsTable({
  students: initialStudents,
  totalPages,
  currentPage,
  initialSearch,
  initialStatus,
}: AdminStudentsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [students, setStudents] = useState(initialStudents)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  const updateUrl = (params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString())
    Object.entries(params).forEach(([k, v]) => {
      if (v) newParams.set(k, v)
      else newParams.delete(k)
    })
    newParams.delete('page')
    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`)
    })
  }

  const handleSearch = (val: string) => {
    setSearch(val)
    updateUrl({ search: val, status: statusFilter })
  }

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val)
    updateUrl({ search, status: val })
  }

  const handleBlock = async (id: string, currentStatus: 'active' | 'blocked') => {
    setLoadingId(id)
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active'
    try {
      const response = await fetch(`/api/admin/students/${id}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        setStudents((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
        )
      }
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по имени, email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Студент</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Телефон</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Зарегистрирован</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Статус</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Студенты не найдены
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{student.first_name} {student.last_name}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{student.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{student.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(student.created_at), 'd MMM yyyy', { locale: ru })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {student.status === 'active' ? 'Активный' : 'Заблокирован'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Просмотр"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleBlock(student.id, student.status)}
                          disabled={loadingId === student.id}
                          className={`rounded-md p-1.5 transition-colors disabled:opacity-50 ${
                            student.status === 'active'
                              ? 'text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950'
                              : 'text-muted-foreground hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-950'
                          }`}
                          title={student.status === 'active' ? 'Заблокировать' : 'Разблокировать'}
                        >
                          {student.status === 'active' ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(currentPage - 1) })}`}
            className={`rounded-lg border p-2 transition-colors hover:bg-muted ${currentPage <= 1 ? 'pointer-events-none opacity-30' : ''}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Link
            href={`${pathname}?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(currentPage + 1) })}`}
            className={`rounded-lg border p-2 transition-colors hover:bg-muted ${currentPage >= totalPages ? 'pointer-events-none opacity-30' : ''}`}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
