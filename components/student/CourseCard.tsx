import Link from 'next/link'
import Image from 'next/image'
import { PlayCircle, Clock, BookOpen } from 'lucide-react'
import { ProgressBar } from '@/components/ui/progress-bar'
import { formatDuration } from '@/lib/utils'

interface CourseCardProps {
  id: string
  title: string
  coverUrl: string | null
  progress: number
  videoCount: number
  totalDuration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string | null
}

const difficultyLabels: Record<string, { label: string; className: string }> = {
  beginner: { label: 'Начинающий', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  intermediate: { label: 'Средний', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  advanced: { label: 'Продвинутый', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
}

export function CourseCard({
  id,
  title,
  coverUrl,
  progress,
  videoCount,
  totalDuration,
  difficulty,
  category,
}: CourseCardProps) {
  const difficultyInfo = difficultyLabels[difficulty] ?? difficultyLabels.beginner
  const isCompleted = progress >= 100

  return (
    <Link href={`/courses/${id}`} className="group block">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        {/* Cover Image */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                Завершён
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Badges */}
          <div className="mb-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyInfo.className}`}>
              {difficultyInfo.label}
            </span>
            {category && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {category}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-3 line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Meta */}
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <PlayCircle className="h-3.5 w-3.5" />
              {videoCount} видео
            </span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(totalDuration)}
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Прогресс</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar
              value={progress}
              size="sm"
              color={isCompleted ? 'success' : 'default'}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
