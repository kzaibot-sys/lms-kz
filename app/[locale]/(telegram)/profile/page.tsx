import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User, Mail, Phone, BookOpen, Award, LogOut } from 'lucide-react'
import type { User as DbUser } from '@/lib/types/database'
import { LogoutButton } from './LogoutButton'

interface PageProps {
  params: { locale: string }
}

export default async function TelegramProfilePage({ params }: PageProps) {
  const { locale } = params
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(`/${locale}/login`)
  }

  // Fetch full user profile + stats in parallel
  const [
    { data: profile },
    { count: certCount },
    { count: videoCount },
  ] = await Promise.all([
    supabase.from('users').select('*').eq('id', authUser.id).single(),
    supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .eq('is_revoked', false),
    supabase
      .from('user_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .eq('is_completed', true),
  ])

  const userData = profile as DbUser | null
  const displayName = userData
    ? `${userData.first_name} ${userData.last_name}`.trim()
    : authUser.email ?? 'Пользователь'

  const initials = userData
    ? `${userData.first_name?.[0] ?? ''}${userData.last_name?.[0] ?? ''}`.toUpperCase()
    : (authUser.email?.[0] ?? 'U').toUpperCase()

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-foreground">Профиль</h1>

      {/* Avatar + Name */}
      <div className="mb-4 flex flex-col items-center rounded-xl border bg-card py-6">
        {userData?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userData.avatar_url}
            alt={displayName}
            className="mb-3 h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        <p className="text-lg font-bold text-foreground">{displayName}</p>
        {authUser.email && (
          <p className="text-sm text-muted-foreground">{authUser.email}</p>
        )}
        <span className="mt-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {userData?.role === 'admin' ? 'Администратор' : 'Студент'}
        </span>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-xl border bg-card p-4">
          <BookOpen className="mb-1 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold text-foreground">{videoCount ?? 0}</p>
          <p className="text-center text-xs text-muted-foreground">Видео завершено</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border bg-card p-4">
          <Award className="mb-1 h-6 w-6 text-primary" />
          <p className="text-2xl font-bold text-foreground">{certCount ?? 0}</p>
          <p className="text-center text-xs text-muted-foreground">Сертификатов</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="mb-4 rounded-xl border bg-card divide-y">
        {authUser.email && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground">{authUser.email}</p>
            </div>
          </div>
        )}
        {userData?.phone && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Телефон</p>
              <p className="text-sm font-medium text-foreground">{userData.phone}</p>
            </div>
          </div>
        )}
        {userData?.bio && (
          <div className="flex items-start gap-3 px-4 py-3">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">О себе</p>
              <p className="text-sm text-foreground">{userData.bio}</p>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <LogoutButton locale={locale} />
    </div>
  )
}
