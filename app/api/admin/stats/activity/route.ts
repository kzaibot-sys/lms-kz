import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const adminUser = await checkAdmin(supabase)

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') ?? '30')
    const startDate = subDays(new Date(), days)

    // Get new students per day
    const { data: newStudents } = await supabase
      .from('users')
      .select('created_at')
      .eq('role', 'student')
      .gte('created_at', startDate.toISOString())
      .order('created_at')

    // Get certificates per day
    const { data: certificates } = await supabase
      .from('certificates')
      .select('issued_at')
      .gte('issued_at', startDate.toISOString())
      .order('issued_at')

    // Build daily data map
    const dataMap = new Map<string, { newStudents: number; completedCourses: number; certificates: number }>()

    for (let i = 0; i < days; i++) {
      const date = format(subDays(new Date(), days - 1 - i), 'MM/dd')
      dataMap.set(date, { newStudents: 0, completedCourses: 0, certificates: 0 })
    }

    newStudents?.forEach((s) => {
      const date = format(new Date(s.created_at), 'MM/dd')
      const entry = dataMap.get(date)
      if (entry) entry.newStudents++
    })

    certificates?.forEach((c) => {
      const date = format(new Date(c.issued_at), 'MM/dd')
      const entry = dataMap.get(date)
      if (entry) {
        entry.certificates++
        entry.completedCourses++
      }
    })

    const activityData = Array.from(dataMap.entries()).map(([date, values]) => ({
      date,
      ...values,
    }))

    return NextResponse.json({ activity: activityData })
  } catch (error) {
    console.error('GET /api/admin/stats/activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
