import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Award, Download, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default async function CertificatesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('language')
    .eq('id', user.id)
    .single()
  const profile = profileRaw as { language: string } | null
  const lang = profile?.language ?? 'ru'

  // Fetch certificates with course info
  const { data: certificatesRaw } = await supabase
    .from('certificates')
    .select(`
      id,
      certificate_number,
      issued_at,
      pdf_url,
      is_revoked,
      revoked_at,
      revoke_reason,
      courses (
        id,
        title_ru,
        title_kz,
        cover_url
      )
    `)
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  const certificates = certificatesRaw as any[] | null

  const certList = certificates ?? []

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Мои сертификаты</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {certList.length} сертификатов
        </p>
      </div>

      {certList.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Сертификатов нет"
          description="Завершите курс, чтобы получить сертификат об окончании"
          action={
            <Link
              href="/courses"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Перейти к курсам
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {certList.map((cert) => {
            const course = cert.courses as {
              id: string
              title_ru: string
              title_kz: string
              cover_url: string | null
            } | null

            if (!course) return null

            const courseTitle = lang === 'kz' ? course.title_kz : course.title_ru
            const issuedDate = format(new Date(cert.issued_at), 'd MMMM yyyy', { locale: ru })

            return (
              <div
                key={cert.id}
                className={`rounded-xl border bg-card p-5 shadow-sm ${cert.is_revoked ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{courseTitle}</h3>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Выдан {issuedDate}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        № {cert.certificate_number}
                      </div>
                      {cert.is_revoked && (
                        <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
                          Сертификат отозван
                          {cert.revoke_reason ? `: ${cert.revoke_reason}` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!cert.is_revoked && (
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      {cert.pdf_url && (
                        <a
                          href={`/api/certificates/${cert.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Скачать PDF
                        </a>
                      )}
                      <Link
                        href={`/verify/${cert.certificate_number}`}
                        target="_blank"
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        Проверить
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
