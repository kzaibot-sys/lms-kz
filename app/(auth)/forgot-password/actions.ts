'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const forgotPasswordSchema = z.object({
  email: z.string().email('Некорректный email'),
})

type ForgotPasswordState = {
  error?: string
  success?: boolean
}

export async function forgotPassword(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const raw = {
    email: formData.get('email') as string,
  }

  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Некорректный email' }
  }

  const supabase = createClient()

  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: redirectUrl,
  })

  if (error) {
    // Don't reveal whether email exists
    console.error('Reset password error:', error)
  }

  // Always return success to prevent email enumeration
  return { success: true }
}
