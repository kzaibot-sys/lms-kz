import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AdminCourseForm } from '@/components/admin/AdminCourseForm'

export default function AdminNewCoursePage() {
  return (
    <div className="p-6">
      <Link
        href="/admin/courses"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Назад к курсам
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Создать курс</h1>
      <AdminCourseForm />
    </div>
  )
}
