'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { forgotPassword } from './actions'

type ForgotPasswordState = {
  error?: string
  success?: boolean
}

const initialState: ForgotPasswordState = {}

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useFormState(forgotPassword, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">LMS Platform</h1>
          <p className="text-muted-foreground mt-2">Восстановление пароля</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold text-card-foreground mb-1">Восстановление пароля</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Введите ваш email для получения ссылки сброса пароля
          </p>

          {state?.success ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-800 text-sm rounded-md px-4 py-3 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
                Ссылка для сброса пароля отправлена на ваш email
              </div>
              <Link
                href="/login"
                className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors text-center"
              >
                Вернуться к входу
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              {/* Error message */}
              {state?.error && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-3 border border-destructive/20">
                  {state.error}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="введите email"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50"
                  disabled={isPending}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Отправка...' : 'Отправить ссылку для сброса'}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary hover:underline"
                >
                  Вернуться к входу
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
