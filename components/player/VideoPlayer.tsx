'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { useRouter } from 'next/navigation'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Settings,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface VideoPlayerProps {
  videoId: string
  hlsUrl: string
  savedPosition?: number
  duration?: number
  onComplete?: () => void
  prevVideoId?: string
  nextVideoId?: string
  courseId: string
  locale: string
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const
const QUALITY_LABELS: Record<number, string> = {}
const SKIP_SECONDS = 10
const PROGRESS_SAVE_INTERVAL = 10000
const COMPLETE_THRESHOLD = 0.9

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function VideoPlayer({
  videoId,
  hlsUrl,
  savedPosition = 0,
  duration: propDuration,
  onComplete,
  prevVideoId,
  nextVideoId,
  courseId,
  locale,
}: VideoPlayerProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const progressSaveRef = useRef<NodeJS.Timeout | null>(null)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = useRef(false)
  const hasRestoredRef = useRef(false)
  const hasCompletedRef = useRef(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration ?? 0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [qualities, setQualities] = useState<{ label: string; level: number }[]>([])
  const [currentQuality, setCurrentQuality] = useState<number>(-1) // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [buffered, setBuffered] = useState(0)

  // ─── Save progress to API ────────────────────────────────────────────────
  const saveProgress = useCallback(
    async (time: number, videoDuration: number) => {
      if (!videoDuration || videoDuration === 0) return
      const percentage = (time / videoDuration) * 100
      try {
        await fetch(`/api/videos/${videoId}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentTime: Math.floor(time),
            completionPercentage: Math.min(100, Math.round(percentage)),
            isCompleted: percentage >= COMPLETE_THRESHOLD * 100,
          }),
        })
      } catch {
        // Silent fail — progress saving is non-critical
      }
    },
    [videoId]
  )

  // ─── HLS Setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !hlsUrl) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      })
      hlsRef.current = hls
      hls.loadSource(hlsUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels.map((level, idx) => {
          const height = level.height
          let label = 'Auto'
          if (height >= 1080) label = '1080p'
          else if (height >= 720) label = '720p'
          else if (height >= 480) label = '480p'
          else label = `${height}p`
          QUALITY_LABELS[idx] = label
          return { label, level: idx }
        })
        setQualities(levels)

        if (savedPosition > 0 && !hasRestoredRef.current) {
          hasRestoredRef.current = true
          video.currentTime = savedPosition
        }
        video.play().catch(() => {
          setIsPlaying(false)
        })
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError()
              break
            default:
              hls.destroy()
              break
          }
        }
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = hlsUrl
      if (savedPosition > 0 && !hasRestoredRef.current) {
        hasRestoredRef.current = true
        video.currentTime = savedPosition
      }
      video.play().catch(() => setIsPlaying(false))
    }
  }, [hlsUrl, savedPosition])

  // ─── Video event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onDurationChange = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration)
      }
    }
    const onTimeUpdate = () => {
      if (!isDraggingRef.current) {
        setCurrentTime(video.currentTime)
      }
      // Track buffered
      if (video.buffered.length > 0) {
        const buf = (video.buffered.end(video.buffered.length - 1) / video.duration) * 100
        setBuffered(isNaN(buf) ? 0 : buf)
      }
      // Mark completed
      if (
        !hasCompletedRef.current &&
        video.duration > 0 &&
        video.currentTime / video.duration >= COMPLETE_THRESHOLD
      ) {
        hasCompletedRef.current = true
        onComplete?.()
        saveProgress(video.currentTime, video.duration)
      }
    }
    const onVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('volumechange', onVolumeChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('volumechange', onVolumeChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [onComplete, saveProgress])

  // ─── Auto-save progress every 10s ────────────────────────────────────────
  useEffect(() => {
    progressSaveRef.current = setInterval(() => {
      const video = videoRef.current
      if (video && video.currentTime > 0 && video.duration > 0) {
        saveProgress(video.currentTime, video.duration)
      }
    }, PROGRESS_SAVE_INTERVAL)

    return () => {
      if (progressSaveRef.current) clearInterval(progressSaveRef.current)
    }
  }, [saveProgress])

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          toggleMute()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-SKIP_SECONDS)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(SKIP_SECONDS)
          break
        case 'ArrowUp':
          e.preventDefault()
          adjustVolume(0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          adjustVolume(-0.1)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isMuted, isFullscreen])

  // ─── Controls auto-hide ───────────────────────────────────────────────────
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current) setShowControls(false)
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [])

  // ─── Player Controls ──────────────────────────────────────────────────────
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
  }

  const adjustVolume = (delta: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = Math.max(0, Math.min(1, video.volume + delta))
    video.muted = false
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const val = parseFloat(e.target.value)
    video.volume = val
    video.muted = val === 0
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  const setSpeed = (speed: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = speed
    setPlaybackSpeed(speed)
    setShowSpeedMenu(false)
  }

  const setQuality = (levelIndex: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = levelIndex
    setCurrentQuality(levelIndex)
    setShowQualityMenu(false)
  }

  // ─── Timeline/Progress interactions ──────────────────────────────────────
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !video.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    video.currentTime = ratio * video.duration
    setCurrentTime(video.currentTime)
  }

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    handleTimelineClick(e)

    const onMouseMove = (ev: MouseEvent) => {
      const target = document.querySelector('[data-timeline]') as HTMLDivElement
      if (!target) return
      const video = videoRef.current
      if (!video || !video.duration) return
      const rect = target.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      setCurrentTime(ratio * video.duration)
    }

    const onMouseUp = (ev: MouseEvent) => {
      const target = document.querySelector('[data-timeline]') as HTMLDivElement
      if (target) {
        const video = videoRef.current
        if (video && video.duration) {
          const rect = target.getBoundingClientRect()
          const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
          video.currentTime = ratio * video.duration
          setCurrentTime(video.currentTime)
        }
      }
      isDraggingRef.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  // Touch events for mobile timeline
  const handleTimelineTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const video = videoRef.current
    if (!video || !video.duration) return
    const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    video.currentTime = ratio * video.duration
    setCurrentTime(video.currentTime)
  }

  const handleTimelineTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const video = videoRef.current
    if (!video || !video.duration) return
    const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    video.currentTime = ratio * video.duration
    setCurrentTime(video.currentTime)
  }

  const handleTimelineTouchEnd = () => {
    isDraggingRef.current = false
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  const goToPrev = () => {
    if (prevVideoId) {
      router.push(`/${locale}/courses/${courseId}/videos/${prevVideoId}`)
    }
  }
  const goToNext = () => {
    if (nextVideoId) {
      router.push(`/${locale}/courses/${courseId}/videos/${nextVideoId}`)
    }
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
  const currentQualityLabel =
    currentQuality === -1 ? 'Auto' : (QUALITY_LABELS[currentQuality] ?? 'Auto')

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-black select-none',
        'aspect-video overflow-hidden rounded-lg',
        isFullscreen && 'rounded-none'
      )}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={showControlsTemporarily}
      onMouseLeave={() => {
        if (!isDraggingRef.current && isPlaying) {
          controlsTimerRef.current = setTimeout(() => setShowControls(false), 1000)
        }
      }}
      onTouchStart={showControlsTemporarily}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        preload="auto"
        onClick={togglePlay}
        style={{ cursor: showControls ? 'default' : 'none' }}
      />

      {/* Controls Overlay */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col justify-between transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Top bar: Prev/Next navigation */}
        <div className="flex items-center justify-between px-4 pt-3">
          <button
            onClick={goToPrev}
            disabled={!prevVideoId}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white',
              'bg-black/50 backdrop-blur-sm transition-colors',
              prevVideoId
                ? 'hover:bg-black/70 cursor-pointer'
                : 'opacity-30 cursor-not-allowed'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Предыдущее</span>
          </button>

          <button
            onClick={goToNext}
            disabled={!nextVideoId}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white',
              'bg-black/50 backdrop-blur-sm transition-colors',
              nextVideoId
                ? 'hover:bg-black/70 cursor-pointer'
                : 'opacity-30 cursor-not-allowed'
            )}
          >
            <span className="hidden sm:inline">Следующее</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Center play/pause click area (invisible) */}
        <div className="flex-1 cursor-pointer" onClick={togglePlay} />

        {/* Bottom controls */}
        <div className="bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
          {/* Timeline */}
          <div
            data-timeline
            className="relative h-3 cursor-pointer group mb-3"
            onMouseDown={handleTimelineMouseDown}
            onTouchStart={handleTimelineTouchStart}
            onTouchMove={handleTimelineTouchMove}
            onTouchEnd={handleTimelineTouchEnd}
          >
            {/* Track background */}
            <div className="absolute inset-y-1/2 -translate-y-1/2 w-full h-1 bg-white/30 rounded-full overflow-hidden">
              {/* Buffered */}
              <div
                className="absolute h-full bg-white/50 rounded-full"
                style={{ width: `${buffered}%` }}
              />
              {/* Progress */}
              <div
                className="absolute h-full bg-primary rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Thumb */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow-md',
                'transition-transform group-hover:scale-125',
                'pointer-events-none'
              )}
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>

          {/* Control buttons row */}
          <div className="flex items-center gap-2">
            {/* Skip Back */}
            <button
              onClick={() => skip(-SKIP_SECONDS)}
              className="text-white hover:text-primary transition-colors p-1 rounded"
              title="Назад 10с"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-primary transition-colors p-1 rounded"
              title={isPlaying ? 'Пауза (Space)' : 'Воспроизвести (Space)'}
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skip(SKIP_SECONDS)}
              className="text-white hover:text-primary transition-colors p-1 rounded"
              title="Вперёд 10с"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1 group/vol">
              <button
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors p-1 rounded"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={cn(
                  'w-0 group-hover/vol:w-20 transition-all duration-200 overflow-hidden',
                  'accent-primary h-1 cursor-pointer'
                )}
                title="Volume"
              />
            </div>

            {/* Time display */}
            <span className="text-white text-xs font-mono ml-1 shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu((v) => !v)
                  setShowQualityMenu(false)
                }}
                className="text-white hover:text-primary transition-colors px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20"
                title="Скорость воспроизведения"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-black/90 rounded-md py-1 min-w-[80px] z-50 shadow-lg">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setSpeed(speed)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors',
                        speed === playbackSpeed && 'text-primary'
                      )}
                    >
                      {speed === playbackSpeed && <Check className="h-3 w-3 shrink-0" />}
                      <span className={cn(speed !== playbackSpeed && 'ml-5')}>{speed}x</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Selector */}
            {qualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu((v) => !v)
                    setShowSpeedMenu(false)
                  }}
                  className="text-white hover:text-primary transition-colors px-2 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 flex items-center gap-1"
                  title="Качество видео"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>{currentQualityLabel}</span>
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-8 right-0 bg-black/90 rounded-md py-1 min-w-[90px] z-50 shadow-lg">
                    {/* Auto option */}
                    <button
                      onClick={() => setQuality(-1)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors',
                        currentQuality === -1 && 'text-primary'
                      )}
                    >
                      {currentQuality === -1 && <Check className="h-3 w-3 shrink-0" />}
                      <span className={cn(currentQuality !== -1 && 'ml-5')}>Auto</span>
                    </button>
                    {qualities.map(({ label, level }) => (
                      <button
                        key={level}
                        onClick={() => setQuality(level)}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-1.5 text-xs text-white hover:bg-white/10 transition-colors',
                          currentQuality === level && 'text-primary'
                        )}
                      >
                        {currentQuality === level && <Check className="h-3 w-3 shrink-0" />}
                        <span className={cn(currentQuality !== level && 'ml-5')}>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-primary transition-colors p-1 rounded"
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close menus */}
      {(showQualityMenu || showSpeedMenu) && (
        <div
          className="absolute inset-0 z-40"
          onClick={() => {
            setShowQualityMenu(false)
            setShowSpeedMenu(false)
          }}
        />
      )}
    </div>
  )
}
