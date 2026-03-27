import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: certs, error } = await supabase
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
        title_kz
      )
    `)
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(certs ?? [])
}
