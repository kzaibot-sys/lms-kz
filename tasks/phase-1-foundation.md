# Фаза 1: Основа проекта

> Статус: Ожидает | Оценка: 2–3 дня | Зависит от: Фаза 0

## Цель

Создать скаффолд Next.js 14 проекта с полной конфигурацией стека.

---

## Чеклист

### Инициализация проекта
- [ ] `npx create-next-app@latest lms --typescript --tailwind --app --src-dir=false`
- [ ] Установить Shadcn/ui: `npx shadcn-ui@latest init`
- [ ] Установить next-intl: `npm install next-intl`
- [ ] Установить Supabase клиент: `npm install @supabase/supabase-js @supabase/ssr`

### Настройка Shadcn/ui
- [ ] Добавить базовые компоненты: button, input, card, dialog, table, badge, toast
- [ ] Настроить тему (dark mode поддержка)
- [ ] Добавить `next-themes` для dark/light переключения

### Настройка next-intl
- [ ] Создать `messages/ru.json` и `messages/kz.json`
- [ ] Настроить `i18n.ts` с локалями `['ru', 'kz']`
- [ ] Создать `middleware.ts` для locale routing
- [ ] Настроить `next.config.js` с `createNextIntlPlugin`
- [ ] Создать `app/[locale]/layout.tsx`

### Supabase клиент
- [ ] Создать `lib/supabase/client.ts` (browser client)
- [ ] Создать `lib/supabase/server.ts` (server client с cookie)
- [ ] Создать `lib/supabase/middleware.ts` (для обновления сессии)
- [ ] Обновить `middleware.ts` — добавить supabase session refresh

### Структура папок
- [ ] Создать `app/[locale]/(student)/` для студентских страниц
- [ ] Создать `app/[locale]/(admin)/` для админки
- [ ] Создать `app/api/` для API Routes
- [ ] Создать `components/ui/`, `components/player/`, `components/admin/`, `components/student/`
- [ ] Создать `lib/auth/`, `lib/utils/`
- [ ] Создать `worker/` директорию

### Миграции БД (Supabase)
- [ ] Создать все таблицы из PRD раздел 4:
  - [ ] `users`
  - [ ] `courses`
  - [ ] `videos`
  - [ ] `user_progress`
  - [ ] `certificates`
  - [ ] `video_processing_jobs`
- [ ] Создать все индексы (раздел 4.7 PRD)
- [ ] Включить RLS на всех таблицах
- [ ] Создать базовые RLS политики

### Типы TypeScript
- [ ] Сгенерировать типы из Supabase: `npx supabase gen types typescript`
- [ ] Создать `lib/types/index.ts` с общими типами

### Конфигурационные файлы
- [ ] `.env.local.example` со всеми переменными
- [ ] `.gitignore` (исключить .env.local, node_modules, .next)
- [ ] `docker-compose.yml` для локальной разработки

### Проверка
- [ ] `npm run dev` запускается без ошибок
- [ ] `/ru` и `/kz` маршруты работают
- [ ] Supabase подключение проверено (тестовый запрос)
- [ ] TypeScript компилируется без ошибок (`npm run build`)

---

## Базовая структура переводов

```json
// messages/ru.json (начало)
{
  "nav": {
    "courses": "Курсы",
    "certificates": "Сертификаты",
    "profile": "Профиль",
    "logout": "Выйти"
  },
  "auth": {
    "login": "Войти",
    "email": "Email",
    "password": "Пароль",
    "forgotPassword": "Забыли пароль?"
  }
}
```
