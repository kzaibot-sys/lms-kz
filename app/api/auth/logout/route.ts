import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/auth/logout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
