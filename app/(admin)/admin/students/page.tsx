import { createClient } from '@/lib/supabase/server'
import { AdminStudentsTable } from '@/components/admin/AdminStudentsTable'

interface SearchParams {
  search?: string
  status?: string
  page?: string
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createClient()

  const search = searchParams.search ?? ''
  const status = searchParams.status ?? 'all'
  const page = parseInt(searchParams.page ?? '1', 10)
  const pageSize = 20
  const offset = (page - 1) * pageSize

  let query = supabase
    .from('users')
    .select('id, email, first_name, last_name, phone, status, role, created_at', { count: 'exact' })
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
    )
  }

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: students, count } = await query

  const totalPages = count ? Math.ceil(count / pageSize) : 1

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Студенты</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {count ?? 0} студентов всего
          </p>
        </div>
        <a
          href="/api/admin/students/export"
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Экспорт CSV
        </a>
      </div>

      <AdminStudentsTable
        students={students ?? []}
        totalPages={totalPages}
        currentPage={page}
        initialSearch={search}
        initialStatus={status}
      />
    </div>
  )
}
