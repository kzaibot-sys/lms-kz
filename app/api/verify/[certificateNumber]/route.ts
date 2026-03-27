import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: { certificateNumber: string } }
) {
  try {
    const supabase = createAdminClient()

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        id,
        certificate_number,
        issued_at,
        is_revoked,
        revoked_at,
        revoke_reason,
        users!inner(first_name, last_name, email),
        courses!inner(title_ru, title_kz)
      `)
      .eq('certificate_number', params.certificateNumber)
      .single()

    if (error || !certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    return NextResponse.json({ certificate })
  } catch (error) {
    console.error('GET /api/verify/[certificateNumber] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
