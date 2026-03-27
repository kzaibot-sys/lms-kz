export type {
  User,
  Course,
  Video,
  UserProgress,
  Certificate,
  VideoProcessingJob,
  UserRole,
  UserStatus,
  UserLanguage,
  Difficulty,
  SourceType,
  ProcessingStatus,
  JobType,
  JobStatus,
  Database,
} from './database'

export interface CourseWithProgress {
  id: string
  title_ru: string
  title_kz: string
  description_ru: string | null
  description_kz: string | null
  cover_url: string | null
  category: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  sort_order: number
  is_published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  video_count: number
  total_duration: number
  progress_percentage: number
  completed_videos: number
  is_completed: boolean
}

export interface VideoWithProgress {
  id: string
  course_id: string
  title_ru: string
  title_kz: string
  description_ru: string | null
  description_kz: string | null
  duration_seconds: number
  source_type: 'youtube' | 'upload'
  original_url: string | null
  hls_url: string | null
  thumbnail_url: string | null
  order_index: number
  processing_status: 'pending' | 'processing' | 'ready' | 'error'
  processing_error: string | null
  created_at: string
  progress?: {
    current_time_seconds: number
    completion_percentage: number
    is_completed: boolean
    last_watched_at: string
  } | null
}

export interface AdminStats {
  totalStudents: number
  activeStudents: number
  completedCourses: number
  issuedCertificates: number
}

export interface ActivityData {
  date: string
  newStudents: number
  completedCourses: number
  certificates: number
}

export interface StudentDetail {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  bio: string | null
  role: 'student' | 'admin'
  status: 'active' | 'blocked'
  language: 'ru' | 'kz'
  created_at: string
  updated_at: string
  totalWatchedSeconds?: number
  completedCoursesCount?: number
  certificatesCount?: number
}
