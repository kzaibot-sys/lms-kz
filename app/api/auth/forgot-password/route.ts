import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    if (error) {
      console.error('Reset password error:', error)
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
