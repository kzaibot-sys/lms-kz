# LMS Platform (lms-kz)

Learning Management System для онлайн-обучения на Next.js 14 + Supabase.

**Домен:** `demo-lms.aibot.kz`

## Стек

- **Frontend + API:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui
- **БД + Auth:** Self-hosted Supabase (PostgreSQL + Auth + Realtime + Storage)
- **i18n:** next-intl (ru / kz)
- **Видеоплеер:** HLS.js с кастомными контролами
- **Видеообработка:** yt-dlp + FFmpeg + Bull Queue (Redis)
- **PDF:** PDFKit + qrcode
- **Telegram:** @telegram-apps/sdk
- **Деплой:** VPS + Docker Compose + Nginx + Let's Encrypt

## Быстрый старт

```bash
# Клонировать
git clone https://github.com/[username]/lms-kz.git
cd lms-kz

# Установить зависимости
npm install

# Скопировать переменные окружения
cp .env.local.example .env.local
# Заполнить .env.local

# Запустить dev сервер
npm run dev
```

## Структура проекта

```
lms-kz/
├── app/                  # Next.js App Router
├── components/           # UI компоненты
├── lib/                  # Утилиты
├── messages/             # Переводы (ru/kz)
├── worker/               # Video processing worker
└── tasks/                # PRD и планы задач по фазам
```

## Фазы разработки

| Фаза | Описание | Документ |
|------|----------|---------|
| 0 | Инфраструктура | tasks/phase-0-infrastructure.md |
| 1 | Основа проекта | tasks/phase-1-foundation.md |
| 2 | Аутентификация | tasks/phase-2-auth.md |
| 3 | Видео-воркер | tasks/phase-3-video-worker.md |
| 4 | Видеоплеер | tasks/phase-4-player.md |
| 5 | Студентский UI | tasks/phase-5-student-ui.md |
| 6 | Сертификаты | tasks/phase-6-certificates.md |
| 7 | Админ-панель | tasks/phase-7-admin.md |
| 8 | Telegram Mini App | tasks/phase-8-telegram.md |
| 9 | Финализация | tasks/phase-9-finalization.md |

## Документация

Полный PRD: [tasks/prd-lms-platform-v2.md](tasks/prd-lms-platform-v2.md)
Правила разработки: [CLAUDE.md](CLAUDE.md)
