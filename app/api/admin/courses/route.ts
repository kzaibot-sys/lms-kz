import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dataRaw } = await supabase
    .from('users')
    .select('role, id')
    .eq('id', user.id)
    .single()

  const data = dataRaw as { role: string; id: string } | null
  return data?.role === 'admin' ? { ...user, dbId: data.id } : null
}

const createCourseSchema = z.object({
  title_ru: z.string().min(1),
  title_kz: z.string().min(1),
  description_ru: z.string().optional().nullable(),
  description_kz: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  sort_order: z.number().int().default(0),
  is_published: z.boolean().default(false),
})

export async function GET() {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        videos(id, duration_seconds, processing_status)
      `)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const enriched = (courses ?? []).map((course: any) => {
      const videos = (course.videos as Array<{ id: string; duration_seconds: number; processing_status: string }>) ?? []
      return {
        ...course,
        video_count: videos.length,
        total_duration: videos.reduce((sum: number, v: any) => sum + (v.duration_seconds ?? 0), 0),
      }
    })

    return NextResponse.json({ courses: enriched })
  } catch (error) {
    console.error('GET /api/admin/courses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createCourseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        ...parsed.data,
        created_by: adminUser.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/courses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
