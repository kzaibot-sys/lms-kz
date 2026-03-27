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

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('certificates')
      .select(`
        id,
        certificate_number,
        issued_at,
        is_revoked,
        revoked_at,
        revoke_reason,
        pdf_url,
        user_id,
        course_id,
        users!inner(first_name, last_name, email),
        courses!inner(title_ru, title_kz)
      `, { count: 'exact' })
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`certificate_number.ilike.%${search}%`)
    }

    const { data: certificates, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      certificates: certificates ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET /api/admin/certificates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const issueCertificateSchema = z.object({
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = issueCertificateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    // Check if certificate already exists
    const { data: existing } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', parsed.data.user_id)
      .eq('course_id', parsed.data.course_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Certificate already exists' }, { status: 409 })
    }

    const { data: certificate, error } = await (supabase as any)
      .from('certificates')
      .insert({
        user_id: parsed.data.user_id,
        course_id: parsed.data.course_id,
        is_revoked: false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ certificate }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/certificates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
