import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Total students
    const { count: totalStudents } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')

    // Active students
    const { count: activeStudents } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('status', 'active')

    // Completed courses (count of certificates)
    const { count: issuedCertificates } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('is_revoked', false)

    // Count unique (user, course) pairs where all videos are completed
    // For simplicity, we use certificates as proxy for completed courses
    const completedCourses = issuedCertificates ?? 0

    return NextResponse.json({
      totalStudents: totalStudents ?? 0,
      activeStudents: activeStudents ?? 0,
      completedCourses,
      issuedCertificates: issuedCertificates ?? 0,
    })
  } catch (error) {
    console.error('GET /api/admin/stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
