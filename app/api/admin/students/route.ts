import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePassword } from '@/lib/utils'

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

const createStudentSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  phone: z.string().optional().nullable(),
  language: z.enum(['ru', 'kz']).default('ru'),
  password: z.string().min(6).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? 'all'
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, avatar_url, status, language, created_at', { count: 'exact' })
      .eq('role', 'student')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: students, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      students: students ?? [],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('GET /api/admin/students error:', error)
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
    const parsed = createStudentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', parsed.data.email)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }

    const password = parsed.data.password || generatePassword()
    const adminClient = createAdminClient()

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create users table record
    const passwordHash = await bcrypt.hash(password, 12)
    const { data: student, error: dbError } = await adminClient
      .from('users')
      .insert({
        id: authData.user.id,
        email: parsed.data.email,
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        phone: parsed.data.phone ?? null,
        language: parsed.data.language,
        role: 'student',
        status: 'active',
        password_hash: passwordHash,
      })
      .select()
      .single()

    if (dbError) {
      // Rollback auth user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ student, password }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/students error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
