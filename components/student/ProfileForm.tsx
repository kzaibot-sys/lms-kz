'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Check } from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

interface ProfileFormProps {
  userId: string
  initialData: {
    firstName: string
    lastName: string
    phone: string
    bio: string
    avatarUrl: string
    language: 'ru' | 'kz'
  }
}

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    firstName: initialData.firstName,
    lastName: initialData.lastName,
    phone: initialData.phone,
    bio: initialData.bio,
  })
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой (максимум 5МБ)')
      return
    }

    setIsUploadingAvatar(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Ошибка загрузки аватара')
      }

      const { avatarUrl: newUrl } = await response.json()
      setAvatarUrl(newUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки аватара')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Ошибка сохранения')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Аватар" width={64} height={64} className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-muted-foreground">
                {initialData.firstName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90 disabled:opacity-50"
          >
            {isUploadingAvatar ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-sm font-medium">Фото профиля</p>
          <p className="text-xs text-muted-foreground">JPG, PNG до 5МБ</p>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Имя</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Фамилия</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1 block text-sm font-medium">Телефон</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+7 (777) 123-45-67"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="mb-1 block text-sm font-medium">О себе</label>
        <textarea
          value={form.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          rows={3}
          placeholder="Расскажите о себе..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      {/* Language */}
      <div>
        <label className="mb-2 block text-sm font-medium">Язык интерфейса</label>
        <LanguageSwitcher currentLocale={initialData.language} />
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSaving}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Сохранение...
          </>
        ) : saved ? (
          <>
            <Check className="h-4 w-4" />
            Сохранено
          </>
        ) : (
          'Сохранить'
        )}
      </button>
    </form>
  )
}
