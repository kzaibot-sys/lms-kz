'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ActivityPoint {
  date: string
  count: number
}

interface TopCourse {
  id: string
  title: string
  enrolled: number
  completionRate: number
}

interface AdminChartsProps {
  activityData: ActivityPoint[]
  topCourses: TopCourse[]
}

export function AdminCharts({ activityData, topCourses }: AdminChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Activity Chart */}
      <div className="col-span-1 rounded-xl border bg-card p-5 shadow-sm lg:col-span-2">
        <h2 className="mb-4 text-base font-semibold">Активность за 30 дней</h2>
        {activityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(val: string) => {
                  const d = new Date(val)
                  return `${d.getDate()}.${d.getMonth() + 1}`
                }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(val: string) => {
                  const d = new Date(val)
                  return d.toLocaleDateString('ru-RU')
                }}
                formatter={(val: number) => [val, 'Просмотров']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Нет данных за последние 30 дней
          </div>
        )}
      </div>

      {/* Top Courses */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Топ 5 курсов</h2>
        {topCourses.length > 0 ? (
          <div className="space-y-3">
            {topCourses.map((course, idx) => (
              <div key={course.id} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{course.enrolled} студентов</span>
                    <span>·</span>
                    <span>{course.completionRate}% завершили</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Нет данных
          </div>
        )}
      </div>
    </div>
  )
}
