import { createClient } from '@/lib/supabase/server'
import { AdminCertificatesTable } from '@/components/admin/AdminCertificatesTable'

export default async function AdminCertificatesPage() {
  const supabase = createClient()

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
      users!certificates_user_id_fkey (
        id,
        first_name,
        last_name,
        email
      ),
      courses (
        id,
        title_ru
      )
    `)
    .order('issued_at', { ascending: false })

  const certificates = certificatesRaw as any[] | null

  // Fetch students and courses for manual issue form
  const { data: students } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('role', 'student')
    .eq('status', 'active')
    .order('first_name')

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title_ru')
    .eq('is_published', true)
    .order('sort_order')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Управление сертификатами</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {certificates?.length ?? 0} сертификатов всего
        </p>
      </div>

      <AdminCertificatesTable
        certificates={(certificates ?? []).map((c) => ({
          id: c.id,
          certificate_number: c.certificate_number,
          issued_at: c.issued_at,
          pdf_url: c.pdf_url,
          is_revoked: c.is_revoked,
          revoked_at: c.revoked_at,
          revoke_reason: c.revoke_reason,
          student: c.users as { id: string; first_name: string; last_name: string; email: string } | null,
          course: c.courses as { id: string; title_ru: string } | null,
        }))}
        students={students ?? []}
        courses={courses ?? []}
      />
    </div>
  )
}
