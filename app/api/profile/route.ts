import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, phone, bio, avatar_url, language, role, status, created_at')
    .eq('id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(profile)
}

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { firstName?: string; lastName?: string; phone?: string | null; bio?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { firstName, lastName, phone, bio } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'Имя и фамилия обязательны' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone?.trim() || null,
      bio: bio?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
