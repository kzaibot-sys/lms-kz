import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { locale } = body
  if (!locale || !['ru', 'kz'].includes(locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  // Update in DB
  await supabase
    .from('users')
    .update({ language: locale as 'ru' | 'kz', updated_at: new Date().toISOString() })
    .eq('id', user.id)

  // Set cookie
  const cookieStore = cookies()
  cookieStore.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
  })

  return NextResponse.json({ success: true, locale })
}
