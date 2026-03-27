import { createClient } from '@/lib/supabase/server'
import { Award, ExternalLink } from 'lucide-react'
import { redirect } from 'next/navigation'
import type { Certificate, Course } from '@/lib/types/database'
import { format } from 'date-fns'

interface PageProps {
  params: { locale: string }
}

interface CertificateWithCourse extends Certificate {
  courses: Pick<Course, 'title_ru' | 'title_kz'> | null
}

export default async function TelegramCertificatesPage({ params }: PageProps) {
  const { locale } = params
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: certificates, error } = await supabase
    .from('certificates')
    .select(`
      *,
      courses (
        title_ru,
        title_kz
      )
    `)
    .eq('user_id', user.id)
    .eq('is_revoked', false)
    .order('issued_at', { ascending: false })

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Не удалось загрузить сертификаты
      </div>
    )
  }

  const certList = (certificates ?? []) as CertificateWithCourse[]

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-foreground">Мои сертификаты</h1>

      {certList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Award className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-base font-medium text-foreground">Нет сертификатов</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Завершите курс, чтобы получить сертификат
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {certList.map((cert) => {
            const courseTitle =
              cert.courses
                ? locale === 'kz'
                  ? cert.courses.title_kz
                  : cert.courses.title_ru
                : 'Неизвестный курс'

            const issuedDate = format(new Date(cert.issued_at), 'dd.MM.yyyy')

            return (
              <div
                key={cert.id}
                className="rounded-xl border bg-card p-4"
              >
                {/* Header */}
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground line-clamp-2">{courseTitle}</p>
                    <p className="text-xs text-muted-foreground">Выдан: {issuedDate}</p>
                  </div>
                </div>

                {/* Certificate number */}
                <p className="mb-3 rounded-lg bg-muted px-3 py-1.5 text-center font-mono text-xs text-muted-foreground">
                  #{cert.certificate_number}
                </p>

                {/* Download / View PDF */}
                {cert.pdf_url && (
                  <a
                    href={cert.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity active:opacity-80"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Открыть PDF
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
