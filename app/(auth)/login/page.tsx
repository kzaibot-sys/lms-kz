'use client'

import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from './actions'

type LoginState = {
  error?: string
  redirectTo?: string
}

const initialState: LoginState = {}

function SubmitButton() {
  return (
    <button
      type="submit"
      className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Войти
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state?.redirectTo) {
      router.push(state.redirectTo)
    }
  }, [state?.redirectTo, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">LMS Platform</h1>
          <p className="text-muted-foreground mt-2">Вход в систему</p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold text-card-foreground mb-1">Введите данные для входа</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Используйте email и пароль, выданные администратором
          </p>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-md px-4 py-3 border border-destructive/20">
                {state.error}
              </div>
            )}

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
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Пароль
                </label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Забыли пароль?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="введите пароль"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors disabled:opacity-50"
              />
            </div>

            <SubmitButton />
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} LMS Platform
        </p>
      </div>
    </div>
  )
}
