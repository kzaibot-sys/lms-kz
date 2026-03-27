'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
    confirmPassword: z.string().min(8, 'Пароль должен содержать не менее 8 символов'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

type ResetPasswordState = {
  error?: string
  success?: boolean
}

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const raw = {
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Ошибка валидации' }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: 'Ошибка обновления пароля. Возможно ссылка устарела.' }
  }

  return { success: true }
}
