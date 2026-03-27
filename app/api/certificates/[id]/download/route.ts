import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch certificate
  const { data: cert, error } = await supabase
    .from('certificates')
    .select('id, user_id, pdf_url, is_revoked')
    .eq('id', params.id)
    .single()

  if (error || !cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  }

  // Only owner can download (or admin)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (cert.user_id !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (cert.is_revoked) {
    return NextResponse.json({ error: 'Certificate has been revoked' }, { status: 410 })
  }

  if (!cert.pdf_url) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  return NextResponse.redirect(cert.pdf_url)
}
