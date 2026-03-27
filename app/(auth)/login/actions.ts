'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

type LoginState = {
  error?: string
  success?: boolean
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Ошибка валидации' }
  }

  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (authError || !authData.user) {
    return { error: 'Неверный email или пароль' }
  }

  // Check user status in users table
  const { data: userDataRaw, error: userError } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', authData.user.id)
    .single()

  if (userError || !userDataRaw) {
    return { error: 'Неверный email или пароль' }
  }

  const userData = userDataRaw as { role: string; status: string }

  if (userData.status === 'blocked') {
    await supabase.auth.signOut()
    return { error: 'Ваш аккаунт заблокирован. Обратитесь к администратору.' }
  }

  // Redirect based on role
  if (userData.role === 'admin') {
    redirect('/admin')
  }

  redirect('/courses')
}

export async function logout(): Promise<void> {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
