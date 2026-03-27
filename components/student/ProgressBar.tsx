import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'default' | 'success' | 'warning'
  className?: string
}

export function ProgressBar({
  value,
  showLabel = false,
  size = 'md',
  color = 'default',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Прогресс</span>
          <span>{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full rounded-full bg-secondary overflow-hidden',
          size === 'sm' && 'h-1.5',
          size === 'md' && 'h-2.5',
          size === 'lg' && 'h-4'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            color === 'default' && 'bg-primary',
            color === 'success' && 'bg-green-500',
            color === 'warning' && 'bg-yellow-500'
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}
