import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Use admin client to bypass RLS for user lookup after login
    const adminClient = createAdminClient()
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, email, first_name, last_name, role, status, language, avatar_url')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (userData.status === 'blocked') {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Account is blocked' }, { status: 403 })
    }

    return NextResponse.json({
      user: userData,
      access_token: authData.session?.access_token,
      refresh_token: authData.session?.refresh_token,
      expires_at: authData.session?.expires_at,
    })
  } catch (error) {
    console.error('POST /api/auth/login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
