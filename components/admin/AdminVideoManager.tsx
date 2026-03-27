'use client'

import { useState } from 'react'
import { Loader2, Trash2, ChevronUp, ChevronDown, Plus, Video, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { Video as VideoType } from '@/lib/types/database'
import { formatDuration } from '@/lib/utils'

interface AdminVideoManagerProps {
  courseId: string
  initialVideos: VideoType[]
}

const statusConfig = {
  pending: { label: 'В очереди', icon: Clock, className: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950' },
  processing: { label: 'Обрабатывается', icon: Loader2, className: 'text-blue-600 bg-blue-100 dark:bg-blue-950' },
  ready: { label: 'Готово', icon: CheckCircle2, className: 'text-green-600 bg-green-100 dark:bg-green-950' },
  error: { label: 'Ошибка', icon: AlertCircle, className: 'text-red-600 bg-red-100 dark:bg-red-950' },
}

export function AdminVideoManager({ courseId, initialVideos }: AdminVideoManagerProps) {
  const [videos, setVideos] = useState(initialVideos)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  const [newVideo, setNewVideo] = useState({
    titleRu: '',
    titleKz: '',
    descriptionRu: '',
    descriptionKz: '',
    youtubeUrl: '',
    sourceType: 'youtube' as 'youtube' | 'upload',
  })

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    setAddError(null)

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_ru: newVideo.titleRu.trim(),
          title_kz: newVideo.titleKz.trim() || newVideo.titleRu.trim(),
          description_ru: newVideo.descriptionRu.trim() || null,
          description_kz: newVideo.descriptionKz.trim() || null,
          source_type: newVideo.sourceType,
          original_url: newVideo.youtubeUrl.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Ошибка добавления видео')
      }

      const data = await response.json()
      const video = data.video ?? data
      setVideos((prev) => [...prev, video])
      setNewVideo({ titleRu: '', titleKz: '', descriptionRu: '', descriptionKz: '', youtubeUrl: '', sourceType: 'youtube' })
      setShowAddForm(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить видео "${title}"?`)) return
    setLoadingId(id)
    try {
      const response = await fetch(`/api/admin/videos/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id))
      }
    } finally {
      setLoadingId(null)
    }
  }

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = videos.findIndex((v) => v.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === videos.length - 1) return

    const newVideos = [...videos]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newVideos[idx], newVideos[swapIdx]] = [newVideos[swapIdx], newVideos[idx]]

    // Update order_index
    newVideos.forEach((v, i) => {
      v = { ...v, order_index: i }
      newVideos[i] = v
    })

    setVideos(newVideos)

    // Save to API
    if (newVideos[0]?.course_id) {
      await fetch('/api/admin/videos/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: newVideos[0].course_id,
          videoIds: newVideos.map((v) => v.id),
        }),
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Video List */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="divide-y">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Видео не добавлены</p>
            </div>
          ) : (
            videos.map((video, idx) => {
              const status = statusConfig[video.processing_status] ?? statusConfig.pending
              const StatusIcon = status.icon

              return (
                <div key={video.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  {/* Order Controls */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMove(video.id, 'up')}
                      disabled={idx === 0 || loadingId === video.id}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(video.id, 'down')}
                      disabled={idx === videos.length - 1 || loadingId === video.id}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Index */}
                  <span className="w-6 text-center text-sm text-muted-foreground">{idx + 1}</span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{video.title_ru}</p>
                    <p className="text-xs text-muted-foreground truncate">{video.title_kz}</p>
                    {video.duration_seconds > 0 && (
                      <p className="text-xs text-muted-foreground">{formatDuration(video.duration_seconds)}</p>
                    )}
                  </div>

                  {/* Status */}
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    <StatusIcon className={`h-3 w-3 ${video.processing_status === 'processing' ? 'animate-spin' : ''}`} />
                    {status.label}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(video.id, video.title_ru)}
                    disabled={loadingId === video.id}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {loadingId === video.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Add Video Form */}
      {showAddForm ? (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Добавить видео</h3>
          <form onSubmit={handleAddVideo} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Название (RU) *</label>
                <input
                  type="text"
                  value={newVideo.titleRu}
                  onChange={(e) => setNewVideo((p) => ({ ...p, titleRu: e.target.value }))}
                  required
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Название (KZ)</label>
                <input
                  type="text"
                  value={newVideo.titleKz}
                  onChange={(e) => setNewVideo((p) => ({ ...p, titleKz: e.target.value }))}
                  placeholder="Если не заполнено — используется RU"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Описание (RU)</label>
              <textarea
                value={newVideo.descriptionRu}
                onChange={(e) => setNewVideo((p) => ({ ...p, descriptionRu: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Источник</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value="youtube"
                    checked={newVideo.sourceType === 'youtube'}
                    onChange={() => setNewVideo((p) => ({ ...p, sourceType: 'youtube' }))}
                    className="accent-primary"
                  />
                  YouTube
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    value="upload"
                    checked={newVideo.sourceType === 'upload'}
                    onChange={() => setNewVideo((p) => ({ ...p, sourceType: 'upload' }))}
                    className="accent-primary"
                  />
                  Загрузить файл
                </label>
              </div>
            </div>

            {newVideo.sourceType === 'youtube' && (
              <div>
                <label className="mb-1 block text-sm font-medium">YouTube URL</label>
                <input
                  type="url"
                  value={newVideo.youtubeUrl}
                  onChange={(e) => setNewVideo((p) => ({ ...p, youtubeUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {addError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {addError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isAdding}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Добавить
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(null) }}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Добавить видео
        </button>
      )}
    </div>
  )
}
