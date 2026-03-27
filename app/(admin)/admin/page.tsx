import { createClient } from '@/lib/supabase/server'
import { Users, TrendingUp, BookOpen, Award } from 'lucide-react'
import { AdminCharts } from '@/components/admin/AdminCharts'

async function getAdminStats() {
  const supabase = createClient()

  // Total students
  const { count: totalStudents } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')

  // Active students (7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activeDataRaw } = await supabase
    .from('user_progress')
    .select('user_id')
    .gte('last_watched_at', sevenDaysAgo)

  const activeData = activeDataRaw as { user_id: string }[] | null
  const activeStudents = new Set(activeData?.map((d) => d.user_id) ?? []).size

  // Completed courses (certificates issued)
  const { count: completedCourses } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('is_revoked', false)

  // Total certificates
  const { count: totalCertificates } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })

  // Activity for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: activityDataRaw } = await supabase
    .from('user_progress')
    .select('last_watched_at')
    .gte('last_watched_at', thirtyDaysAgo)
    .order('last_watched_at', { ascending: true })

  const activityData = activityDataRaw as { last_watched_at: string }[] | null

  // Aggregate by day
  const activityByDay: Record<string, number> = {}
  activityData?.forEach((item) => {
    const day = item.last_watched_at.split('T')[0]
    activityByDay[day] = (activityByDay[day] ?? 0) + 1
  })

  const activityChart = Object.entries(activityByDay).map(([date, count]) => ({
    date,
    count,
  }))

  // Top 5 courses
  const { data: coursesRaw } = await supabase
    .from('courses')
    .select('id, title_ru, title_kz')
    .eq('is_published', true)
    .limit(20)

  const courses = coursesRaw as { id: string; title_ru: string; title_kz: string }[] | null
  const courseIds = courses?.map((c) => c.id) ?? []

  const topCourses: {
    id: string
    title: string
    enrolled: number
    completionRate: number
  }[] = []

  if (courseIds.length > 0) {
    // Get progress stats per course
    const { data: allVideosRaw } = await supabase
      .from('videos')
      .select('id, course_id')
      .in('course_id', courseIds)
      .eq('processing_status', 'ready')

    const allVideos = allVideosRaw as { id: string; course_id: string }[] | null

    const { data: progressDataRaw } = await supabase
      .from('user_progress')
      .select('user_id, video_id, is_completed')
      .in('video_id', allVideos?.map((v) => v.id) ?? [])

    const progressData = progressDataRaw as { user_id: string; video_id: string; is_completed: boolean }[] | null

    const videosByCourse = new Map<string, string[]>()
    allVideos?.forEach((v) => {
      if (!videosByCourse.has(v.course_id)) videosByCourse.set(v.course_id, [])
      videosByCourse.get(v.course_id)!.push(v.id)
    })

    const progressByVideo = new Map<string, Set<string>>()
    progressData?.forEach((p) => {
      if (!progressByVideo.has(p.video_id)) progressByVideo.set(p.video_id, new Set())
      progressByVideo.get(p.video_id)!.add(p.user_id)
    })

    for (const course of courses ?? []) {
      const vids = videosByCourse.get(course.id) ?? []
      const enrolledSet = new Set<string>()
      let completedCount = 0

      vids.forEach((vid) => {
        const users = progressByVideo.get(vid) ?? new Set()
        users.forEach((u) => enrolledSet.add(u))
      })

      // Count users who completed all videos
      enrolledSet.forEach((userId) => {
        const allDone = vids.every((vid) => {
          const p = progressData?.find((pp) => pp.video_id === vid && pp.user_id === userId)
          return p?.is_completed
        })
        if (allDone) completedCount++
      })

      topCourses.push({
        id: course.id,
        title: course.title_ru,
        enrolled: enrolledSet.size,
        completionRate: enrolledSet.size > 0 ? Math.round((completedCount / enrolledSet.size) * 100) : 0,
      })
    }

    topCourses.sort((a, b) => b.enrolled - a.enrolled)
    topCourses.splice(5)
  }

  return {
    totalStudents: totalStudents ?? 0,
    activeStudents,
    completedCourses: completedCourses ?? 0,
    totalCertificates: totalCertificates ?? 0,
    activityChart,
    topCourses,
  }
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()

  const kpiCards = [
    {
      label: 'Всего студентов',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-950',
    },
    {
      label: 'Активные (7 дней)',
      value: stats.activeStudents,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100 dark:bg-green-950',
    },
    {
      label: 'Завершили курсы',
      value: stats.completedCourses,
      icon: BookOpen,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-950',
    },
    {
      label: 'Сертификаты',
      value: stats.totalCertificates,
      icon: Award,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950',
    },
  ]

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Панель управления</h1>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold">{card.value.toLocaleString()}</p>
                </div>
                <div className={`rounded-full p-3 ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <AdminCharts activityData={stats.activityChart} topCourses={stats.topCourses} />
    </div>
  )
}
