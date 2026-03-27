'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

type LoginState = {
  error?: string
  redirectTo?: string
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

  // Use admin client to bypass RLS
  const admin = createAdminClient()
  const { data: userDataRaw, error: userError } = await admin
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

  return { redirectTo: userData.role === 'admin' ? '/admin' : '/courses' }
}

export async function logout(): Promise<LoginState> {
  const supabase = createClient()
  await supabase.auth.signOut()
  return { redirectTo: '/login' }
}
