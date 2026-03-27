import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 })
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Новый пароль слишком короткий (минимум 8 символов)' },
      { status: 400 }
    )
  }

  // Get current password hash
  const { data: profile } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', user.id)
    .single()

  if (!profile?.password_hash) {
    return NextResponse.json({ error: 'Пароль не установлен' }, { status: 400 })
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, profile.password_hash)
  if (!isValid) {
    return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 })
  }

  // Hash new password
  const newHash = await bcrypt.hash(newPassword, 12)

  // Update password hash in users table
  const { error } = await supabase
    .from('users')
    .update({
      password_hash: newHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
