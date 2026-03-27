import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function checkAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dataRaw } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const data = dataRaw as { role: string } | null
  return data?.role === 'admin' ? user : null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reason } = body

    const { data: certificate, error } = await (supabase as any)
      .from('certificates')
      .update({
        is_revoked: true,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason ?? null,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error || !certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    return NextResponse.json({ certificate })
  } catch (error) {
    console.error('PUT /api/admin/certificates/[id]/revoke error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
