# Фаза 2: Аутентификация

> Статус: Ожидает | Оценка: 2–3 дня | Зависит от: Фаза 1

## Чеклист

### Страница логина
- [ ] Создать `/[locale]/login` страницу
- [ ] Форма: email + пароль, валидация
- [ ] Обработка ошибок (неверные данные, заблокирован)
- [ ] Redirect после логина: студент → `/courses`, админ → `/admin`

### Supabase Auth интеграция
- [ ] Настроить email/password провайдер
- [ ] Синхронизировать таблицу `users` с `auth.users` через trigger
- [ ] `lib/auth/session.ts` — хелпер для получения текущего пользователя
- [ ] `lib/auth/actions.ts` — Server Actions: login, logout, forgotPassword

### Middleware (защита маршрутов)
- [ ] `middleware.ts` — проверка сессии для `/[locale]/(student)/*`
- [ ] Редирект `/admin/*` для не-admin ролей → 403
- [ ] Редирект неавторизованных на `/login`

### Сброс пароля
- [ ] `POST /api/auth/forgot-password` — отправить email
- [ ] Страница `/reset-password?token=...`
- [ ] `POST /api/auth/reset-password` — обновить пароль

### Профиль (базовый)
- [ ] `GET /api/auth/me` — данные текущего пользователя
- [ ] `GET /api/profile` — профиль + статистика
- [ ] `PUT /api/profile` — обновить имя, телефон, аватар, биографию
- [ ] `PUT /api/profile/password` — смена пароля

### Внешний API (Telegram-бот)
- [ ] `POST /api/external/students` — создать студента
  - X-API-Key аутентификация
  - bcrypt пароль (rounds=12)
  - Вернуть email + пароль
  - Rate limit: 10 req/min
- [ ] Middleware для X-API-Key проверки

### Проверка
- [ ] Логин работает (студент и админ)
- [ ] Неавторизованный → редирект
- [ ] Внешний API создаёт студента
- [ ] Сброс пароля через email работает
