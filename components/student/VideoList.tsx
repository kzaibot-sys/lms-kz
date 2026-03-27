'use client'

import Link from 'next/link'
import { CheckCircle2, Circle, Clock, PlayCircle, Loader2 } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import type { VideoWithProgress } from '@/lib/types'

interface VideoListProps {
  courseId: string
  videos: VideoWithProgress[]
  currentVideoId?: string
  locale?: string
}

export function VideoList({ courseId, videos, currentVideoId, locale = 'ru' }: VideoListProps) {
  return (
    <div className="space-y-1">
      {videos.map((video, index) => {
        const title = locale === 'kz' ? video.title_kz : video.title_ru
        const isActive = video.id === currentVideoId
        const isCompleted = video.progress?.is_completed ?? false
        const isProcessing = video.processing_status === 'processing' || video.processing_status === 'pending'
        const hasError = video.processing_status === 'error'

        return (
          <Link
            key={video.id}
            href={`/courses/${courseId}/videos/${video.id}`}
            className={cn(
              'flex items-center gap-3 rounded-lg p-3 transition-colors',
              isActive
                ? 'bg-primary/10 border border-primary/20'
                : 'hover:bg-muted',
              (isProcessing || hasError) && 'pointer-events-none opacity-60'
            )}
          >
            {/* Status Icon */}
            <div className="shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : isProcessing ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : hasError ? (
                <Circle className="h-5 w-5 text-destructive" />
              ) : (
                <Circle className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              )}
            </div>

            {/* Number + Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-medium shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className={cn(
                  'text-sm font-medium truncate',
                  isActive ? 'text-primary' : 'text-foreground'
                )}>
                  {title}
                </p>
              </div>
              {isProcessing && (
                <p className="text-xs text-muted-foreground mt-0.5">Обрабатывается...</p>
              )}
              {hasError && (
                <p className="text-xs text-destructive mt-0.5">Ошибка обработки</p>
              )}
            </div>

            {/* Duration */}
            {video.duration_seconds > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration(video.duration_seconds)}</span>
              </div>
            )}

            {/* Play Icon for active */}
            {isActive && !isCompleted && (
              <PlayCircle className="h-4 w-4 text-primary shrink-0" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
