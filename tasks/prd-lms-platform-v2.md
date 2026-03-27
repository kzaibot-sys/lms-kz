# PRD v2: LMS Platform — Финальный документ требований

> Версия: 2.0 | Дата: 2026-03-27 | Статус: Финальный
> Заменяет: `prd-lms-platform.md` (v1.1)

---

## 1. Обзор проекта

### Что строим

LMS-платформа (Learning Management System) для онлайн-обучения. Студенты получают доступ через внешнюю систему (Telegram-бот после оплаты), смотрят видеокурсы, отслеживают прогресс и получают сертификаты. Администраторы управляют контентом и студентами.

### Для кого

- **Студенты** — купили курс через Telegram-бот, получили логин/пароль, учатся
- **Администраторы** — управляют курсами, видео, студентами, сертификатами
- **Telegram-бот** — внешняя система, вызывает API после оплаты для создания аккаунта

### Домен и платформы

- **Домен:** `demo-lms.aibot.kz`
- **Web** — полный функционал (студент + админ)
- **Telegram Mini App** — студенческий функционал (без админ-панели)

### Языки

- Русский и казахский
- Автоопределение из браузера или Telegram
- Ручное переключение (ru / kz)
- Выбор сохраняется в профиле и localStorage

---

## 2. Стек технологий

```
Frontend + API:  Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui
БД + Auth:       Self-hosted Supabase (PostgreSQL + Auth + Realtime + Storage)
i18n:            next-intl
Видеоплеер:      HLS.js + кастомные контролы
Видеообработка:  Node.js воркер + yt-dlp + FFmpeg + Bull Queue (Redis)
PDF:             PDFKit + qrcode
Telegram:        @telegram-apps/sdk
Деплой:          VPS + Docker Compose + Nginx + Let's Encrypt
```

### Обоснование выбора

| Решение | Почему |
|---------|--------|
| Next.js App Router | Server Components, встроенный API, оптимизация |
| Self-hosted Supabase | Полный контроль данных, нет внешней зависимости |
| Bull Queue + Redis | Надёжная очередь для тяжёлой видеообработки |
| HLS.js | Адаптивный bitrate, работает везде без Flash |
| Docker Compose | Воспроизводимый деплой, лёгкое обновление сервисов |

---

## 3. Архитектура деплоя (VPS)

```
VPS (минимум 8 ГБ RAM, 4 vCPU, 100 ГБ SSD)
├── Nginx (reverse proxy + SSL termination)
│   ├── demo-lms.aibot.kz → Next.js :3000
│   └── demo-lms.aibot.kz/storage → Supabase Storage
├── Next.js app (Docker / PM2) :3000
├── Video Worker (Docker) — Bull Queue Consumer
├── Redis (Docker) :6379 — Bull Queue
└── Supabase (Docker Compose) :8000
    ├── PostgreSQL :5432
    ├── GoTrue (Auth) :9999
    ├── Storage API :5000
    ├── Realtime :4000
    └── Kong (API Gateway) :8000
```

### Требования к VPS

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| RAM | 8 ГБ | 16 ГБ |
| CPU | 4 vCPU | 8 vCPU |
| Диск | 100 ГБ SSD | 300 ГБ SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Порты | 80, 443, 22 | 80, 443, 22 |

> Примечание: Supabase сам по себе потребляет ~2–4 ГБ RAM. Next.js + воркер + Redis — ещё ~1–2 ГБ. Видео занимают место на диске (~500 МБ на час видео в HLS).

---

## 4. Схема базы данных

### 4.1 Таблица `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,                    -- bcrypt, rounds=12
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  role            TEXT NOT NULL DEFAULT 'student'  -- 'student' | 'admin'
                  CHECK (role IN ('student', 'admin')),
  status          TEXT NOT NULL DEFAULT 'active'   -- 'active' | 'blocked'
                  CHECK (status IN ('active', 'blocked')),
  language        TEXT NOT NULL DEFAULT 'ru'       -- 'ru' | 'kz'
                  CHECK (language IN ('ru', 'kz')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 Таблица `courses`

```sql
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ru        TEXT NOT NULL,
  title_kz        TEXT,
  description_ru  TEXT,
  description_kz  TEXT,
  cover_url       TEXT,
  category        TEXT,
  difficulty      TEXT NOT NULL DEFAULT 'beginner'
                  CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  sort_order      INT NOT NULL DEFAULT 0,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Таблица `videos`

```sql
CREATE TABLE videos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title_ru            TEXT NOT NULL,
  title_kz            TEXT,
  description_ru      TEXT,
  description_kz      TEXT,
  duration_seconds    INT,
  source_type         TEXT NOT NULL
                      CHECK (source_type IN ('youtube', 'upload')),
  original_url        TEXT,         -- YouTube URL или путь к загруженному файлу
  hls_url             TEXT,         -- URL master.m3u8 в Supabase Storage
  thumbnail_url       TEXT,
  order_index         INT NOT NULL DEFAULT 0,
  processing_status   TEXT NOT NULL DEFAULT 'pending'
                      CHECK (processing_status IN ('pending', 'processing', 'ready', 'error')),
  processing_error    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.4 Таблица `user_progress`

```sql
CREATE TABLE user_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id              UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  current_time_seconds  INT NOT NULL DEFAULT 0,
  completion_percentage FLOAT NOT NULL DEFAULT 0,   -- 0.0 – 100.0
  is_completed          BOOLEAN NOT NULL DEFAULT false,
  last_watched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
```

### 4.5 Таблица `certificates`

```sql
CREATE TABLE certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id          UUID NOT NULL REFERENCES courses(id),
  certificate_number UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), -- для QR
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url            TEXT,
  is_revoked         BOOLEAN NOT NULL DEFAULT false,
  revoked_at         TIMESTAMPTZ,
  revoke_reason      TEXT,
  UNIQUE (user_id, course_id)   -- один сертификат на курс
);
```

### 4.6 Таблица `video_processing_jobs`

```sql
CREATE TABLE video_processing_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  job_type       TEXT NOT NULL CHECK (job_type IN ('youtube', 'upload')),
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  input_url      TEXT,
  output_hls_url TEXT,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);
```

### 4.7 Индексы

```sql
CREATE INDEX idx_videos_course_id ON videos(course_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_video_id ON user_progress(video_id);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_number ON certificates(certificate_number);
```

---

## 5. API эндпоинты

### 5.1 Аутентификация

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| POST | `/api/auth/login` | Вход по email + пароль | — |
| POST | `/api/auth/logout` | Выход, очистить cookie | User |
| POST | `/api/auth/forgot-password` | Отправить письмо сброса | — |
| POST | `/api/auth/reset-password` | Сбросить пароль по токену | — |
| GET | `/api/auth/me` | Данные текущего пользователя | User |

**POST /api/auth/login**
```json
// Request
{ "email": "user@example.com", "password": "secret" }

// Response 200
{ "user": { "id": "uuid", "email": "...", "role": "student", "first_name": "..." } }

// Response 401
{ "error": "Invalid credentials" }
```

### 5.2 Внешний API (Telegram-бот)

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| POST | `/api/external/students` | Создать студента, вернуть пароль | X-API-Key |

**POST /api/external/students**
```json
// Headers
{ "X-API-Key": "ваш-секретный-ключ" }

// Request
{ "name": "Иван Иванов", "email": "ivan@example.com", "phone": "+7700000000" }

// Response 201
{
  "id": "uuid",
  "email": "ivan@example.com",
  "password": "Rand0mP@ss",
  "login_url": "https://demo-lms.aibot.kz/login"
}

// Response 409
{ "error": "Student with this email already exists" }
```

### 5.3 Курсы (студент)

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | `/api/courses` | Список курсов с прогрессом | User |
| GET | `/api/courses/:id` | Детали курса + видео с прогрессом | User |

**GET /api/courses — Response:**
```json
[{
  "id": "uuid",
  "title": "Название курса",          // по языку пользователя
  "description": "Описание",
  "cover_url": "https://...",
  "category": "programming",
  "difficulty": "beginner",
  "videos_count": 12,
  "total_duration_seconds": 7200,
  "progress_percentage": 45.5,        // прогресс текущего пользователя
  "is_completed": false
}]
```

### 5.4 Видео (студент)

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | `/api/videos/:id` | Данные видео (hls_url и т.д.) | User |
| GET | `/api/videos/:id/progress` | Прогресс пользователя | User |
| PUT | `/api/videos/:id/progress` | Сохранить прогресс | User |

**PUT /api/videos/:id/progress**
```json
// Request
{ "current_time": 245, "is_completed": false }

// Response 200
{ "completion_percentage": 67.2, "is_completed": false }
```

### 5.5 Профиль

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | `/api/profile` | Получить профиль + статистику | User |
| PUT | `/api/profile` | Обновить профиль | User |
| PUT | `/api/profile/password` | Сменить пароль | User |

### 5.6 Сертификаты (студент)

| Метод | Путь | Описание | Auth |
|-------|------|----------|------|
| GET | `/api/certificates` | Список сертификатов студента | User |
| GET | `/api/certificates/:id/download` | Скачать PDF | User |
| GET | `/api/verify/:certificate_number` | Публичная верификация | — |

**GET /api/verify/:certificate_number — Response:**
```json
{
  "valid": true,
  "student_name": "Иван Иванов",
  "course_title": "Название курса",
  "issued_at": "2026-01-15T10:00:00Z",
  "is_revoked": false
}
```

### 5.7 Админ — Курсы

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/courses` | Все курсы (включая черновики) |
| POST | `/api/admin/courses` | Создать курс |
| PUT | `/api/admin/courses/:id` | Редактировать курс |
| DELETE | `/api/admin/courses/:id` | Удалить курс |
| POST | `/api/admin/courses/:id/videos` | Добавить видео (YouTube URL / upload) |
| PUT | `/api/admin/videos/:id` | Редактировать видео |
| DELETE | `/api/admin/videos/:id` | Удалить видео |
| PUT | `/api/admin/videos/reorder` | Обновить order_index (drag-drop) |

### 5.8 Админ — Студенты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/students` | Список студентов (поиск, фильтры, пагинация) |
| POST | `/api/admin/students` | Создать студента |
| GET | `/api/admin/students/:id` | Детальный профиль студента |
| PUT | `/api/admin/students/:id` | Редактировать студента |
| PUT | `/api/admin/students/:id/block` | Блокировать / разблокировать |
| DELETE | `/api/admin/students/:id/progress/:courseId` | Сбросить прогресс по курсу |
| GET | `/api/admin/students/export` | Экспорт CSV |

### 5.9 Админ — Сертификаты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/certificates` | Все сертификаты |
| POST | `/api/admin/certificates` | Ручная выдача |
| PUT | `/api/admin/certificates/:id/revoke` | Отозвать с причиной |

### 5.10 Админ — Дашборд

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/stats` | KPI метрики |
| GET | `/api/admin/stats/activity` | Активность по дням (последние 30) |

**GET /api/admin/stats — Response:**
```json
{
  "total_students": 142,
  "active_last_7_days": 89,
  "completed_courses": 34,
  "issued_certificates": 34,
  "top_courses": [
    { "title": "Курс 1", "students_count": 98 }
  ]
}
```

### 5.11 Telegram Mini App

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/telegram/auth` | Верифицировать initData, вернуть сессию |

---

## 6. Безопасность

### 6.1 Пароли
- bcrypt с `rounds=12`
- Минимальная длина пароля: 8 символов

### 6.2 Сессии и JWT
- Supabase Auth (GoTrue) выдаёт JWT
- Сессия хранится в httpOnly cookie (не доступна JS)
- Refresh token rotation включён

### 6.3 Внешний API
- `X-API-Key` в заголовке HTTP-запроса
- Ключ хранится только в `.env` на сервере, не в коде

### 6.4 Rate Limiting (Nginx / middleware)

| Эндпоинт | Лимит |
|----------|-------|
| `/api/auth/*` | 100 req/min |
| `/api/external/*` | 10 req/min |
| Остальное | 500 req/min |

### 6.5 CORS
- Разрешён только `https://demo-lms.aibot.kz`
- Для Telegram Mini App: `https://web.telegram.org` добавляется отдельно

### 6.6 HTTP Security Headers (Nginx)
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Content-Security-Policy "default-src 'self'; ..." always;
```

### 6.7 SQL-инъекции
- Только parameterized queries через Supabase JS клиент
- Прямые SQL-запросы запрещены (используем `supabase.from().select()` и т.д.)

### 6.8 Telegram initData верификация
```
HMAC-SHA256(data_check_string, secret_key)
secret_key = HMAC-SHA256("WebAppData", bot_token)
Проверка: timestamp не старше 1 часа
```

---

## 7. Видео-воркер

### 7.1 Общий флоу

```
Администратор добавил видео
  → Запись в videos (processing_status=pending)
  → Запись в video_processing_jobs (status=pending)
  → Задача отправлена в Bull Queue (Redis)
     ↓
Воркер получил задачу:
  [YouTube]:  yt-dlp [url] -o /tmp/[video_id].mp4
  [Upload]:   файл уже в /tmp/[video_id].mp4
     ↓
  FFmpeg:
    -i /tmp/[video_id].mp4
    → /tmp/[video_id]/480p/  (master.m3u8 + *.ts)
    → /tmp/[video_id]/720p/
    → /tmp/[video_id]/1080p/
    → /tmp/[video_id]/master.m3u8  (adaptive)
     ↓
  Upload → Supabase Storage: /videos/[video_id]/**
     ↓
  UPDATE videos SET hls_url=..., processing_status='ready'
  UPDATE video_processing_jobs SET status='done', completed_at=now()
     ↓
  Webhook → POST /api/internal/video-processed { video_id, status }
  (Next.js обновляет UI через Realtime или polling)
```

### 7.2 Обработка ошибок

- При ошибке: `processing_status='error'`, `processing_error=message`
- Retry: Bull автоматически повторяет до 3 раз с экспоненциальной задержкой
- После 3 неудач: `video_processing_jobs.status='failed'`, уведомление в лог

### 7.3 FFmpeg команды

**Конвертация в HLS (многобитрейтовый):**
```bash
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]split=3[v1][v2][v3]" \
  -map "[v1]" -vf scale=854:480 -c:v h264 -b:v 800k \
    -hls_time 6 -hls_playlist_type vod output/480p/index.m3u8 \
  -map "[v2]" -vf scale=1280:720 -c:v h264 -b:v 2500k \
    -hls_time 6 -hls_playlist_type vod output/720p/index.m3u8 \
  -map "[v3]" -vf scale=1920:1080 -c:v h264 -b:v 5000k \
    -hls_time 6 -hls_playlist_type vod output/1080p/index.m3u8 \
  -map 0:a -c:a aac -b:a 128k \
    -hls_time 6 -hls_playlist_type vod output/audio/index.m3u8
```

---

## 8. Функциональные требования (все 68 + дополнения)

### 8.1 Аутентификация (требования 1–7)

1. Вход по email + пароль для студентов
2. Отдельный вход для администраторов (роль задаётся в БД)
3. Аутентификация через Telegram `initData` для Telegram Mini App
4. JWT-токены через Supabase Auth
5. Защищённые маршруты (редирект неавторизованных)
6. "Забыли пароль" через email
7. Сессия хранится в httpOnly cookie

### 8.2 Внешний API (требования 8–10)

8. `POST /api/external/students` — создание студента: `{name, email, phone}`, возвращает пароль
9. API-ключ в заголовке `X-API-Key` (настраивается в env)
10. Опциональная отправка welcome-email студенту

### 8.3 Каталог курсов (требования 11–14)

11. Список курсов с обложкой, названием, описанием, прогрессом (%)
12. Фильтр по категории и статусу (в процессе / завершён)
13. Поиск по названию
14. Карточка: количество видео, общая длительность, уровень сложности

### 8.4 Страница курса (требования 15–17)

15. Список видео с прогрессом по каждому
16. Индикация завершённых (галочка)
17. Кнопка "Продолжить" — переход к последнему незавершённому видео

### 8.5 Видеоплеер (требования 18–26)

18. Кастомный HLS-плеер для всех видео
19. YouTube-видео: скачиваются через yt-dlp → HLS → Supabase Storage
20. Загруженные видео: FFmpeg → HLS → Supabase Storage
21. Функции: Play/Pause, скорость (0.5x, 1x, 1.25x, 1.5x, 2x), перемотка ±10 сек, fullscreen, Mute/Volume, timeline
22. Адаптивный bitrate (480p, 720p, 1080p)
23. Автосохранение прогресса каждые 10 секунд
24. Восстановление позиции при повторном открытии
25. Видео = завершено при >90% просмотра
26. Кнопки "Предыдущее" / "Следующее видео"

### 8.6 Профиль студента (требования 27–30)

27. Редактирование: имя, фамилия, телефон, аватар, биография
28. Email не редактируется студентом
29. Смена пароля
30. Статистика: общее время, завершённых курсов, общий прогресс

### 8.7 Сертификаты (требования 31–36)

31. Автовыдача при 100% прохождения курса
32. Ручная выдача / отзыв администратором
33. PDF: имя, курс, дата, уникальный номер, QR-код
34. Страница "Мои сертификаты"
35. Кнопка "Скачать PDF"
36. Публичная верификация по QR-коду (без авторизации)

### 8.8 Многоязычность (требования 37–40)

37. Полный перевод интерфейса (ru / kz)
38. Автоопределение из браузера или Telegram
39. Ручное переключение в шапке
40. Сохранение в localStorage и профиле

### 8.9 Telegram Mini App (требования 41–46)

41. Та же Next.js страница, открывается как Mini App
42. Аутентификация через `initData` (HMAC верификация)
43. Если аккаунт не найден — предложение войти по email
44. Доступно: курсы, видео, прогресс, профиль, сертификаты
45. Недоступно: админ-панель
46. UI: bottom navigation, touch-friendly кнопки

### 8.10 Админ — Курсы (требования 47–51)

47. Список всех курсов: создать / редактировать / удалить
48. Создание: название (ru/kz), описание (ru/kz), категория, сложность, обложка, порядок, статус
49. Управление видео: добавить (YouTube / upload), редактировать, drag-drop порядок, удалить
50. Статус обработки видео
51. Предпросмотр курса глазами студента

### 8.11 Админ — Студенты (требования 52–60)

52. Таблица: имя, email, телефон, регистрация, статус, прогресс
53. Поиск по имени / email
54. Фильтры: статус, прогресс
55. Детальный профиль студента с историей
56. Редактирование данных студента
57. Блокировка / разблокировка
58. Сброс прогресса по курсу
59. Ручное создание студента из админки
60. Экспорт CSV

### 8.12 Админ — Статистика (требования 61–64)

61. KPI: всего студентов, активных за 7 дней, завершённых курсов, сертификатов
62. График активности по дням (30 дней)
63. Топ-5 курсов по числу студентов
64. Таблица студентов с сортировкой по прогрессу

### 8.13 Админ — Сертификаты (требования 65–68)

65. Список всех сертификатов с фильтрами
66. Ручная выдача
67. Отзыв с указанием причины
68. Настройка шаблона: логотип, текст подписи

---

## 9. Нефункциональные требования

### 9.1 Производительность

| Метрика | Цель |
|---------|------|
| Video Load Time | < 3 сек до начала воспроизведения |
| API Response Time | < 200ms для 95% запросов |
| Certificate Generation | < 5 сек |
| Page Load (LCP) | < 2.5 сек |

### 9.2 Надёжность

| Метрика | Цель |
|---------|------|
| Uptime | ≥ 99.5% |
| Progress Sync | Восстановление в 100% случаев |
| Telegram Mini App | Работает на iOS и Android |

### 9.3 Масштабируемость

- Рассчитано на 500+ студентов одновременно
- При росте: видео-воркер переносится на отдельный VPS
- Supabase Storage: хранение локально (настраивается путь)

---

## 10. Дизайн

- **Mobile-first** — все страницы оптимизированы для мобильных
- **Bottom Navigation** в Telegram Mini App (4 иконки: Курсы, Прогресс, Сертификаты, Профиль)
- **Sidebar Navigation** на десктопе для студентов
- **Dark mode** — автоматически по системной теме
- Видеоплеер: вся ширина на мобильном
- Минималистичный дизайн, Shadcn/ui + Tailwind CSS

---

## 11. Вне рамок проекта (Не-цели)

- Встроенная оплата (внешний Telegram-бот)
- Чат и комментарии (Фаза 2)
- Викторины и тесты (Фаза 2)
- Геймификация — badges, leaderboard (Фаза 3)
- Native iOS/Android приложение
- Видеоконференции / живые уроки
- Telegram-бот (отдельный проект)
- Роли внутри админки (только один уровень — супер-админ)

---

## 12. Открытые вопросы

1. **Email-уведомления:** нужны ли письма при выдаче сертификата или напоминания?
2. **Лимит видео:** максимальный размер загружаемого файла? (рекомендуется 5 ГБ)
3. **yt-dlp риск:** YouTube может заблокировать — нужен ли fallback на iframe?
4. **Резервное копирование:** стратегия бэкапа БД и видео на внешнее хранилище (S3, Backblaze)?
5. **Supabase URL:** API на `demo-lms.aibot.kz/supabase` или `supabase.aibot.kz`?

---

## 13. Фазы реализации

### Фаза 0: Инфраструктура (1–2 дня)
1. VPS: Ubuntu 22.04, Docker, Docker Compose
2. Cloudflare DNS: A-запись `demo-lms` → IP VPS
3. Nginx + SSL (Let's Encrypt / Certbot)
4. Self-hosted Supabase (официальный Docker Compose)
5. Redis
6. Проверка: все сервисы запущены, SSL работает

### Фаза 1: Основа проекта (2–3 дня)
1. `npx create-next-app@latest lms --typescript`
2. Tailwind CSS + Shadcn/ui
3. next-intl (ru/kz переводы)
4. Supabase клиент (supabase-js)
5. Миграции БД (все таблицы из раздела 4)
6. Структура папок: `app/`, `components/`, `lib/`, `worker/`

### Фаза 2: Аутентификация (2–3 дня)
1. Страница `/login`
2. Supabase Auth (email/password)
3. `middleware.ts` — защита роутов
4. Профиль студента (GET/PUT /api/profile)
5. Внешний API: `POST /api/external/students`

### Фаза 3: Видео-воркер (3–4 дня)
1. Node.js воркер (`/worker`)
2. Bull Queue + Redis подключение
3. yt-dlp + FFmpeg интеграция
4. Загрузка в Supabase Storage
5. Webhook-уведомления → Next.js

### Фаза 4: Видеоплеер + Прогресс (3–4 дня)
1. HLS.js компонент с кастомными контролами
2. API прогресса (GET/PUT `/api/videos/:id/progress`)
3. Автосохранение каждые 10 сек
4. Восстановление позиции

### Фаза 5: Студентский UI (3–4 дня)
1. Каталог курсов с фильтрами
2. Страница курса (список видео + прогресс)
3. Страница видео (плеер + навигация)
4. Профиль + настройки + смена пароля

### Фаза 6: Сертификаты (2–3 дня)
1. PDFKit шаблон + QR-код
2. Авто-выдача при 100%
3. Страница "Мои сертификаты"
4. Публичная верификация `/verify/:certificate_number`

### Фаза 7: Админ-панель (4–5 дней)
1. Layout + sidebar + авторизация `/admin`
2. Создание/редактирование курсов
3. Управление видео (drag-drop + upload + YouTube)
4. Список студентов + поиск + блокировка + CSV
5. Дашборд со статистикой
6. Управление сертификатами

### Фаза 8: Telegram Mini App (2–3 дня)
1. `@telegram-apps/sdk` интеграция
2. initData верификация (HMAC-SHA256)
3. Telegram-специфичный layout (bottom nav)
4. Тестирование на iOS и Android Telegram

### Фаза 9: Финализация (2–3 дня)
1. E2E тестирование всех флоу
2. Performance оптимизация (bundle size, images)
3. Security audit (заголовки, CORS, rate limits)
4. Мониторинг: логи (stdout → файл), uptime check

---

*Версия: 2.0 | Дата: 2026-03-27 | Автор: Claude*
