'use client'

import { useState } from 'react'
import { Loader2, Eye, EyeOff, Check } from 'lucide-react'

export function ChangePasswordForm() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (form.newPassword.length < 8) {
      setError('Новый пароль слишком короткий (минимум 8 символов)')
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Ошибка изменения пароля')
      }

      setSuccess(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка изменения пароля')
    } finally {
      setIsLoading(false)
    }
  }

  const PasswordInput = ({
    label,
    field,
    show,
    toggle,
  }: {
    label: string
    field: keyof typeof form
    show: boolean
    toggle: () => void
  }) => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={form[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          required
          className="w-full rounded-lg border bg-background py-2 pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PasswordInput
        label="Текущий пароль"
        field="currentPassword"
        show={showCurrent}
        toggle={() => setShowCurrent((v) => !v)}
      />
      <PasswordInput
        label="Новый пароль"
        field="newPassword"
        show={showNew}
        toggle={() => setShowNew((v) => !v)}
      />
      <PasswordInput
        label="Подтвердить пароль"
        field="confirmPassword"
        show={showConfirm}
        toggle={() => setShowConfirm((v) => !v)}
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600 dark:bg-green-950 dark:text-green-400">
          Пароль успешно изменён
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Сохранение...
          </>
        ) : success ? (
          <>
            <Check className="h-4 w-4" />
            Изменено
          </>
        ) : (
          'Изменить пароль'
        )}
      </button>
    </form>
  )
}
