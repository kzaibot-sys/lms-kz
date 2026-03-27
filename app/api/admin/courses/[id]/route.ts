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

const updateCourseSchema = z.object({
  title_ru: z.string().min(1).optional(),
  title_kz: z.string().min(1).optional(),
  description_ru: z.string().optional().nullable(),
  description_kz: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  sort_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
})

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

    const { data: courseRaw, error } = await supabase
      .from('courses')
      .select(`
        *,
        videos(*)
      `)
      .eq('id', params.id)
      .single()

    if (error || !courseRaw) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const course = courseRaw as any

    // Sort videos by order_index
    const videos = ((course.videos as Array<Record<string, unknown>>) ?? [])
      .sort((a, b) => (a.order_index as number) - (b.order_index as number))

    return NextResponse.json({ course: { ...course, videos } })
  } catch (error) {
    console.error('GET /api/admin/courses/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
    const parsed = updateCourseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const { data: course, error } = await (supabase as any)
      .from('courses')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ course })
  } catch (error) {
    console.error('PUT /api/admin/courses/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/courses/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
