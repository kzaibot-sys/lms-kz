import { notFound } from 'next/navigation'
import { CheckCircle2, XCircle, Award, Calendar, User, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Props {
  params: { certificate_number: string }
}

export default async function VerifyCertificatePage({ params }: Props) {
  const supabase = createClient()

  const { data: cert, error } = await supabase
    .from('certificates')
    .select(`
      id,
      certificate_number,
      issued_at,
      is_revoked,
      revoked_at,
      revoke_reason,
      users (
        first_name,
        last_name
      ),
      courses (
        title_ru,
        title_kz
      )
    `)
    .eq('certificate_number', params.certificate_number)
    .single()

  if (error || !cert) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-xl font-bold">Сертификат не найден</h1>
          <p className="text-sm text-muted-foreground">
            Сертификат с номером{' '}
            <span className="font-mono font-semibold">{params.certificate_number}</span> не найден
            в базе данных.
          </p>
        </div>
      </div>
    )
  }

  const usersRaw = cert.users as any
  const student = (Array.isArray(usersRaw) ? usersRaw[0] : usersRaw) as { first_name: string; last_name: string } | null
  const coursesRaw = cert.courses as any
  const course = (Array.isArray(coursesRaw) ? coursesRaw[0] : coursesRaw) as { title_ru: string; title_kz: string } | null

  const issuedDate = format(new Date(cert.issued_at), 'd MMMM yyyy', { locale: ru })
  const revokedDate = cert.revoked_at
    ? format(new Date(cert.revoked_at), 'd MMMM yyyy', { locale: ru })
    : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        {/* Certificate Card */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
          {/* Header */}
          <div
            className={`p-6 text-center text-white ${
              cert.is_revoked ? 'bg-red-600' : 'bg-gradient-to-r from-primary to-primary/80'
            }`}
          >
            {cert.is_revoked ? (
              <XCircle className="mx-auto mb-3 h-16 w-16 opacity-90" />
            ) : (
              <CheckCircle2 className="mx-auto mb-3 h-16 w-16 opacity-90" />
            )}
            <h1 className="text-xl font-bold">
              {cert.is_revoked ? 'Сертификат отозван' : 'Сертификат действителен'}
            </h1>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Студент
                </p>
                <p className="font-semibold">
                  {student ? `${student.first_name} ${student.last_name}` : 'Неизвестно'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Курс
                </p>
                <p className="font-semibold">{course?.title_ru ?? 'Неизвестно'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Дата выдачи
                </p>
                <p className="font-semibold">{issuedDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Номер сертификата
                </p>
                <p className="font-mono font-semibold text-sm">{cert.certificate_number}</p>
              </div>
            </div>

            {cert.is_revoked && (
              <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Отозван {revokedDate}
                </p>
                {cert.revoke_reason && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Причина: {cert.revoke_reason}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-muted/50 px-6 py-3 text-center text-xs text-muted-foreground">
            LMS Platform — Онлайн-образование
          </div>
        </div>
      </div>
    </div>
  )
}
