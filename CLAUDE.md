# CLAUDE.md — LMS Platform (lms-kz)

## Проект

LMS-платформа для онлайн-обучения. Студенты получают доступ через Telegram-бот (после оплаты), смотрят видеокурсы, отслеживают прогресс и получают сертификаты. Администраторы управляют контентом и студентами.

**Домен:** `demo-lms.aibot.kz`
**PRD:** `tasks/prd-lms-platform-v2.md`

---

## Стек технологий

```
Frontend + API:  Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui
БД + Auth:       Self-hosted Supabase (PostgreSQL + Auth + Realtime + Storage)
i18n:            next-intl (ru / kz)
Видеоплеер:      HLS.js + кастомные контролы
Видеообработка:  Node.js воркер + yt-dlp + FFmpeg + Bull Queue (Redis)
PDF:             PDFKit + qrcode
Telegram:        @telegram-apps/sdk
Деплой:          VPS + Docker Compose + Nginx + Let's Encrypt
```

---

## Структура проекта

```
lms-kz/
├── app/                    # Next.js App Router
│   ├── [locale]/           # Локализованные маршруты (ru/kz)
│   │   ├── (student)/      # Студентские страницы
│   │   ├── (admin)/        # Админ-панель
│   │   └── layout.tsx
│   └── api/                # API Routes
│       ├── auth/
│       ├── courses/
│       ├── videos/
│       ├── certificates/
│       ├── profile/
│       ├── admin/
│       ├── external/
│       └── telegram/
├── components/             # Переиспользуемые компоненты
│   ├── ui/                 # Shadcn/ui компоненты
│   ├── player/             # HLS видеоплеер
│   ├── admin/              # Компоненты админ-панели
│   └── student/            # Компоненты студентских страниц
├── lib/                    # Утилиты и хелперы
│   ├── supabase/           # Supabase клиент и утилиты
│   ├── auth/               # Auth middleware/утилиты
│   └── i18n/               # Конфигурация next-intl
├── messages/               # Переводы (ru.json, kz.json)
├── worker/                 # Video processing worker
│   ├── index.ts            # Bull Queue consumer
│   ├── processors/         # youtube.ts, upload.ts
│   └── utils/              # ffmpeg.ts, storage.ts
├── tasks/                  # PRD и планы задач
│   ├── prd-lms-platform-v2.md
│   ├── phase-0-infrastructure.md
│   ├── phase-1-foundation.md
│   ├── phase-2-auth.md
│   ├── phase-3-video-worker.md
│   ├── phase-4-player.md
│   ├── phase-5-student-ui.md
│   ├── phase-6-certificates.md
│   ├── phase-7-admin.md
│   ├── phase-8-telegram.md
│   └── phase-9-finalization.md
├── docker/                 # Docker конфигурации
├── public/                 # Статические файлы
├── CLAUDE.md               # Этот файл
└── README.md
```

---

## Архитектура

### Деплой (VPS)
```
Nginx (reverse proxy + SSL)
├── demo-lms.aibot.kz → Next.js :3000
└── demo-lms.aibot.kz/storage → Supabase Storage

Сервисы:
├── Next.js app :3000
├── Video Worker (Bull Queue Consumer)
├── Redis :6379
└── Self-hosted Supabase :8000
    ├── PostgreSQL :5432
    ├── GoTrue Auth :9999
    ├── Storage API :5000
    └── Realtime :4000
```

### База данных (основные таблицы)
- `users` — студенты и администраторы
- `courses` — курсы (ru/kz поля)
- `videos` — видео с HLS ссылками
- `user_progress` — прогресс студентов
- `certificates` — сертификаты + PDF
- `video_processing_jobs` — очередь обработки видео

---

## Правила разработки

### Обязательные правила
1. **Только parameterized queries** через Supabase JS клиент — никаких прямых SQL строк
2. **httpOnly cookie** для хранения сессии — не localStorage
3. **bcrypt rounds=12** для паролей
4. **X-API-Key** для внешнего API — только в .env, не в коде
5. **next-intl** для всех строк — никаких хардкоженных текстов
6. **TypeScript strict mode** — никаких `any` без явного обоснования

### Архитектурные решения
- Server Components по умолчанию, Client Components только при необходимости
- API Routes в `app/api/` — не pages/api
- Supabase Row Level Security (RLS) включён на всех таблицах
- Все видео проходят через HLS конвертацию (никаких прямых mp4 ссылок студентам)

### Запрещено
- Хранить секреты в коде (используй .env.local)
- Делать прямые запросы к PostgreSQL в обход Supabase клиента
- Использовать `eval()` или динамический SQL
- Коммитить .env файлы

### Git workflow
- Коммитить после каждой завершённой фазы
- Пушить в `main` ветку GitHub репозитория
- Формат коммита: `feat: описание` / `fix: описание` / `chore: описание`

---

## Фазы разработки

| Фаза | Название | Файл задач |
|------|----------|-----------|
| 0 | Инфраструктура | `tasks/phase-0-infrastructure.md` |
| 1 | Основа проекта | `tasks/phase-1-foundation.md` |
| 2 | Аутентификация | `tasks/phase-2-auth.md` |
| 3 | Видео-воркер | `tasks/phase-3-video-worker.md` |
| 4 | Видеоплеер + Прогресс | `tasks/phase-4-player.md` |
| 5 | Студентский UI | `tasks/phase-5-student-ui.md` |
| 6 | Сертификаты | `tasks/phase-6-certificates.md` |
| 7 | Админ-панель | `tasks/phase-7-admin.md` |
| 8 | Telegram Mini App | `tasks/phase-8-telegram.md` |
| 9 | Финализация | `tasks/phase-9-finalization.md` |

---

## Среда разработки

```bash
# Установка зависимостей
npm install

# Dev сервер
npm run dev

# Билд
npm run build

# Запуск воркера
npm run worker

# Docker (полный стек)
docker compose up -d
```

### Переменные окружения (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EXTERNAL_API_KEY=
REDIS_URL=redis://localhost:6379
TELEGRAM_BOT_TOKEN=
NEXT_PUBLIC_APP_URL=https://demo-lms.aibot.kz
```

---

## MCP и инструменты

- **Supabase MCP** — для работы с БД (миграции, SQL, типы)
- **GitHub MCP** — для коммитов, PR, issues
- **Playwright MCP** — для E2E тестирования
- **Shadcn MCP** — для добавления UI компонентов
- **Context7 MCP** — для документации библиотек

---

*Последнее обновление: 2026-03-27*
