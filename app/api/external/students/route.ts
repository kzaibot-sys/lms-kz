import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/server'
import { generatePassword } from '@/lib/utils'

const createStudentSchema = z.object({
  email: z.string().email('Invalid email'),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  language: z.enum(['ru', 'kz']).optional().default('ru'),
})

// Simple in-memory rate limiting per IP (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10 // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) {
    return false
  }

  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get('x-api-key')
    const validApiKey = process.env.EXTERNAL_API_KEY

    if (!validApiKey || apiKey !== validApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = createStudentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    const { email, first_name, last_name, phone, language } = parsed.data

    const supabase = createAdminClient()

    // Check for duplicate email
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'A student with this email already exists' },
        { status: 409 }
      )
    }

    // Generate password
    const plainPassword = generatePassword(12)
    const passwordHash = await bcrypt.hash(plainPassword, 12)

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: plainPassword,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      console.error('Auth user creation error:', authError)

      // Check if it's a duplicate email in auth
      if (authError?.message?.toLowerCase().includes('already registered') ||
          authError?.message?.toLowerCase().includes('already exists')) {
        return NextResponse.json(
          { error: 'A student with this email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user record in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        password_hash: passwordHash,
        first_name,
        last_name,
        phone: phone || null,
        role: 'student',
        status: 'active',
        language,
      })
      .select('id, email, first_name, last_name')
      .single()

    if (userError || !userData) {
      console.error('User record creation error:', userError)
      // Rollback auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json(
      {
        id: userData.id,
        email: userData.email,
        password: plainPassword,
        login_url: `${appUrl}/login`,
        first_name: userData.first_name,
        last_name: userData.last_name,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('POST /api/external/students error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
