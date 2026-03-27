import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: student, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, avatar_url, bio, role, status, language, created_at, updated_at')
      .eq('id', params.id)
      .single()

    if (error || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Fetch progress stats
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('current_time_seconds, is_completed, video_id')
      .eq('user_id', params.id)

    const totalWatchedSeconds = progressData?.reduce((sum, p) => sum + (p.current_time_seconds ?? 0), 0) ?? 0

    // Fetch certificates
    const { data: certificates, count: certCount } = await supabase
      .from('certificates')
      .select('id, course_id, certificate_number, issued_at, is_revoked', { count: 'exact' })
      .eq('user_id', params.id)
      .eq('is_revoked', false)

    return NextResponse.json({
      student: {
        ...student,
        totalWatchedSeconds,
        completedCoursesCount: certCount ?? 0,
        certificatesCount: certCount ?? 0,
      },
      certificates: certificates ?? [],
    })
  } catch (error) {
    console.error('GET /api/admin/students/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateStudentSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  language: z.enum(['ru', 'kz']).optional(),
  status: z.enum(['active', 'blocked']).optional(),
})

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
    const parsed = updateStudentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const { data: student, error } = await supabase
      .from('users')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error('PUT /api/admin/students/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
