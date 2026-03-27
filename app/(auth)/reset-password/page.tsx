'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { resetPassword } from './actions'

type ResetPasswordState = {
  error?: string
  success?: boolean
}

const initialState: ResetPasswordState = {}

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useFormState(resetPassword, initialState)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">LMS Platform</h1>
          <p className="text-muted-foreground mt-2">Новый пароль</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold text-card-foreground mb-1">Установите новый пароль</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Введите новый пароль для вашего аккаунта
          </p>

          {state?.success ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-800 text-sm rounded-md px-4 py-3 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
                Пароль успешно обновлён
              </div>
              <Link
                href="/login"
                className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors text-center"
              >
                Войти с новым паролем
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

              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Новый пароль
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="введите новый пароль"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50"
                  disabled={isPending}
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                  Подтвердите пароль
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="повторите новый пароль"
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
                {isPending ? 'Сохранение...' : 'Сохранить новый пароль'}
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
