import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body // 'block' or 'unblock'

    if (action !== 'block' && action !== 'unblock') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const newStatus = action === 'block' ? 'blocked' : 'active'

    const { data: student, error } = await supabase
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('role', 'student')
      .select()
      .single()

    if (error || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error('PUT /api/admin/students/[id]/block error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
