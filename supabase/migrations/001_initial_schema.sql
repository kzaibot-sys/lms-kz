-- ============================================================
-- LMS Platform - Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('student', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'blocked');
CREATE TYPE user_language AS ENUM ('ru', 'kz');
CREATE TYPE difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE source_type AS ENUM ('youtube', 'upload');
CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'ready', 'error');
CREATE TYPE job_type AS ENUM ('transcode', 'thumbnail');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================================
-- TABLES
-- ============================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  role            user_role NOT NULL DEFAULT 'student',
  status          user_status NOT NULL DEFAULT 'active',
  language        user_language NOT NULL DEFAULT 'ru',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses table
CREATE TABLE public.courses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ru        TEXT NOT NULL,
  title_kz        TEXT NOT NULL,
  description_ru  TEXT,
  description_kz  TEXT,
  cover_url       TEXT,
  category        TEXT,
  difficulty      difficulty NOT NULL DEFAULT 'beginner',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Videos table
CREATE TABLE public.videos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id           UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title_ru            TEXT NOT NULL,
  title_kz            TEXT NOT NULL,
  description_ru      TEXT,
  description_kz      TEXT,
  duration_seconds    INTEGER NOT NULL DEFAULT 0,
  source_type         source_type NOT NULL DEFAULT 'youtube',
  original_url        TEXT,
  hls_url             TEXT,
  thumbnail_url       TEXT,
  order_index         INTEGER NOT NULL DEFAULT 0,
  processing_status   processing_status NOT NULL DEFAULT 'pending',
  processing_error    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User progress table
CREATE TABLE public.user_progress (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_id                UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  current_time_seconds    INTEGER NOT NULL DEFAULT 0,
  completion_percentage   NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  is_completed            BOOLEAN NOT NULL DEFAULT FALSE,
  last_watched_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, video_id)
);

-- Certificates table
CREATE TABLE public.certificates (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number  TEXT NOT NULL UNIQUE DEFAULT CONCAT('CERT-', TO_CHAR(NOW(), 'YYYY'), '-', LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0')),
  issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url             TEXT,
  is_revoked          BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at          TIMESTAMPTZ,
  revoke_reason       TEXT,
  UNIQUE (user_id, course_id)
);

-- Video processing jobs table
CREATE TABLE public.video_processing_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id        UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  job_type        job_type NOT NULL,
  status          job_status NOT NULL DEFAULT 'pending',
  input_url       TEXT,
  output_hls_url  TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_status ON public.users (status);

-- Courses indexes
CREATE INDEX idx_courses_is_published ON public.courses (is_published);
CREATE INDEX idx_courses_sort_order ON public.courses (sort_order);
CREATE INDEX idx_courses_category ON public.courses (category);
CREATE INDEX idx_courses_difficulty ON public.courses (difficulty);
CREATE INDEX idx_courses_created_by ON public.courses (created_by);

-- Videos indexes
CREATE INDEX idx_videos_course_id ON public.videos (course_id);
CREATE INDEX idx_videos_order_index ON public.videos (course_id, order_index);
CREATE INDEX idx_videos_processing_status ON public.videos (processing_status);

-- User progress indexes
CREATE INDEX idx_user_progress_user_id ON public.user_progress (user_id);
CREATE INDEX idx_user_progress_video_id ON public.user_progress (video_id);
CREATE INDEX idx_user_progress_last_watched ON public.user_progress (last_watched_at DESC);

-- Certificates indexes
CREATE INDEX idx_certificates_user_id ON public.certificates (user_id);
CREATE INDEX idx_certificates_course_id ON public.certificates (course_id);
CREATE INDEX idx_certificates_number ON public.certificates (certificate_number);
CREATE INDEX idx_certificates_is_revoked ON public.certificates (is_revoked);

-- Video processing jobs indexes
CREATE INDEX idx_vpj_video_id ON public.video_processing_jobs (video_id);
CREATE INDEX idx_vpj_status ON public.video_processing_jobs (status);

-- ============================================================
-- TRIGGERS: updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_processing_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: users
-- ============================================================

-- Users can read their own data
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "admins_select_all_users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can update their own non-sensitive profile fields
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    AND status = (SELECT status FROM public.users WHERE id = auth.uid())
  );

-- Admins can update any user
CREATE POLICY "admins_update_all_users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Service role can insert (for registration via API)
CREATE POLICY "service_insert_users"
  ON public.users FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- RLS POLICIES: courses
-- ============================================================

-- All authenticated users can view published courses
CREATE POLICY "authenticated_select_published_courses"
  ON public.courses FOR SELECT
  USING (
    is_published = TRUE
    AND auth.uid() IS NOT NULL
  );

-- Admins can view all courses (including drafts)
CREATE POLICY "admins_select_all_courses"
  ON public.courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can insert courses
CREATE POLICY "admins_insert_courses"
  ON public.courses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can update courses
CREATE POLICY "admins_update_courses"
  ON public.courses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can delete courses
CREATE POLICY "admins_delete_courses"
  ON public.courses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- RLS POLICIES: videos
-- ============================================================

-- Authenticated users can view videos from published courses
CREATE POLICY "authenticated_select_videos"
  ON public.videos FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND c.is_published = TRUE
    )
  );

-- Admins can view all videos
CREATE POLICY "admins_select_all_videos"
  ON public.videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can manage videos
CREATE POLICY "admins_insert_videos"
  ON public.videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "admins_update_videos"
  ON public.videos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "admins_delete_videos"
  ON public.videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- RLS POLICIES: user_progress
-- ============================================================

-- Users can view their own progress
CREATE POLICY "users_select_own_progress"
  ON public.user_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "admins_select_all_progress"
  ON public.user_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can insert their own progress
CREATE POLICY "users_insert_own_progress"
  ON public.user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "users_update_own_progress"
  ON public.user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can delete/reset progress
CREATE POLICY "admins_delete_progress"
  ON public.user_progress FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- RLS POLICIES: certificates
-- ============================================================

-- Users can view their own certificates
CREATE POLICY "users_select_own_certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all certificates
CREATE POLICY "admins_select_all_certificates"
  ON public.certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can issue certificates
CREATE POLICY "admins_insert_certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can update (revoke) certificates
CREATE POLICY "admins_update_certificates"
  ON public.certificates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- RLS POLICIES: video_processing_jobs
-- ============================================================

-- Admins can manage all processing jobs
CREATE POLICY "admins_all_vpj"
  ON public.video_processing_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get course progress for a user
CREATE OR REPLACE FUNCTION get_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (
  total_videos     BIGINT,
  completed_videos BIGINT,
  progress_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(v.id) AS total_videos,
    COUNT(up.id) FILTER (WHERE up.is_completed = TRUE) AS completed_videos,
    CASE
      WHEN COUNT(v.id) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        (COUNT(up.id) FILTER (WHERE up.is_completed = TRUE)::NUMERIC / COUNT(v.id)::NUMERIC) * 100,
        2
      )
    END AS progress_percent
  FROM public.videos v
  LEFT JOIN public.user_progress up
    ON up.video_id = v.id AND up.user_id = p_user_id
  WHERE v.course_id = p_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has completed a course (for auto-certification)
CREATE OR REPLACE FUNCTION check_course_completion(p_user_id UUID, p_course_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total     BIGINT;
  v_completed BIGINT;
BEGIN
  SELECT
    COUNT(v.id),
    COUNT(up.id) FILTER (WHERE up.is_completed = TRUE)
  INTO v_total, v_completed
  FROM public.videos v
  LEFT JOIN public.user_progress up
    ON up.video_id = v.id AND up.user_id = p_user_id
  WHERE v.course_id = p_course_id;

  RETURN v_total > 0 AND v_total = v_completed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
