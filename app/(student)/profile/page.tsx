import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/student/ProfileForm'
import { ChangePasswordForm } from '@/components/student/ChangePasswordForm'
import { BookOpen, Clock, Award } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

export default async function ProfilePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileRaw) redirect('/login')

  const profile = profileRaw as any

  // Fetch stats
  const { data: progressDataRaw } = await supabase
    .from('user_progress')
    .select('is_completed, current_time_seconds')
    .eq('user_id', user.id)

  const progressData = progressDataRaw as { is_completed: boolean; current_time_seconds: number }[] | null

  // Calculate total watch time (sum of current_time_seconds)
  const totalWatchTime = progressData?.reduce((sum, p) => sum + (p.current_time_seconds ?? 0), 0) ?? 0

  // Count completed courses: need to check if all videos in a course are done
  const { data: completedCertsRaw } = await supabase
    .from('certificates')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_revoked', false)

  const completedCerts = completedCertsRaw as { id: string }[] | null

  const completedCourses = completedCerts?.length ?? 0

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Профиль</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <Clock className="mx-auto mb-2 h-6 w-6 text-primary" />
          <div className="text-2xl font-bold">{formatDuration(totalWatchTime)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Время просмотра</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <BookOpen className="mx-auto mb-2 h-6 w-6 text-primary" />
          <div className="text-2xl font-bold">{completedCourses}</div>
          <div className="mt-1 text-xs text-muted-foreground">Завершённых курсов</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center col-span-2 sm:col-span-1">
          <Award className="mx-auto mb-2 h-6 w-6 text-primary" />
          <div className="text-2xl font-bold">{completedCourses}</div>
          <div className="mt-1 text-xs text-muted-foreground">Сертификатов</div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="mb-6 rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Личные данные</h2>
        </div>
        <div className="p-4">
          <ProfileForm
            userId={user.id}
            initialData={{
              firstName: profile.first_name,
              lastName: profile.last_name,
              phone: profile.phone ?? '',
              bio: profile.bio ?? '',
              avatarUrl: profile.avatar_url ?? '',
              language: profile.language,
            }}
          />
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Изменить пароль</h2>
        </div>
        <div className="p-4">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}
