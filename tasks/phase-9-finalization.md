# Фаза 9: Финализация

> Статус: Ожидает | Оценка: 2–3 дня | Зависит от: Фаза 8

## Чеклист

### E2E тестирование (Playwright)
- [ ] Установить Playwright: `npm install @playwright/test`
- [ ] Тест: полный флоу студента (логин → курс → видео → прогресс → сертификат)
- [ ] Тест: логин через внешний API
- [ ] Тест: публичная верификация сертификата
- [ ] Тест: admin CRUD курса
- [ ] Тест: admin управление студентами

### Performance оптимизация
- [ ] Проверить bundle size (`npm run build` + analyze)
- [ ] Image optimization (Next.js Image component везде)
- [ ] Lazy loading компонентов (dynamic imports)
- [ ] Prefetching ключевых маршрутов
- [ ] Проверить LCP < 2.5 сек (Lighthouse)

### Security audit
- [ ] Проверить все API routes: авторизация на каждом
- [ ] Rate limiting: `/api/auth/*` 100 req/min, `/api/external/*` 10 req/min
- [ ] CORS конфигурация (только demo-lms.aibot.kz)
- [ ] HTTP Security Headers в Nginx
- [ ] Проверить: нет захардкоженных секретов в коде
- [ ] Supabase RLS политики — проверить все таблицы
- [ ] Content Security Policy настроен

### Мониторинг
- [ ] Structured logging в Next.js (stdout → файл через Docker)
- [ ] Uptime check (UptimeRobot или аналог)
- [ ] Error tracking (Sentry или базовый alert на email)
- [ ] Disk usage alert при > 80% заполнении

### Финальный деплой
- [ ] Docker Compose для production
- [ ] `.env.production` с реальными секретами
- [ ] `npm run build` успешен
- [ ] `docker compose up -d` — все контейнеры Running
- [ ] SSL работает, redirect HTTP → HTTPS
- [ ] Supabase Studio доступен на internal порту

### Документация
- [ ] README.md — установка, запуск, деплой
- [ ] Обновить CLAUDE.md
- [ ] Комментарии к сложным частям (воркер, auth, Telegram)

### Финальная проверка
- [ ] Открыть `demo-lms.aibot.kz` — всё работает
- [ ] Telegram Mini App открывается и работает
- [ ] Все 68 требований из PRD выполнены
- [ ] Performance: LCP < 2.5s, API < 200ms (95%)
