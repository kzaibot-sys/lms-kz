import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dataRaw } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const data = dataRaw as { role: string } | null
  return data?.role === 'admin' ? user : null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? 'all'

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, status, language, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: students, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build CSV
    const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Phone', 'Status', 'Language', 'Registered At']
    const rows = (students ?? []).map((s) => [
      s.id,
      s.email,
      s.first_name,
      s.last_name,
      s.phone ?? '',
      s.status,
      s.language,
      format(new Date(s.created_at), 'yyyy-MM-dd HH:mm:ss'),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="students-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    })
  } catch (error) {
    console.error('GET /api/admin/students/export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
