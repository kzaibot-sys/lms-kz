# Фаза 8: Telegram Mini App

> Статус: Ожидает | Оценка: 2–3 дня | Зависит от: Фаза 7

## Чеклист

### SDK и интеграция
- [ ] Установить: `npm install @telegram-apps/sdk`
- [ ] `lib/telegram/init.ts` — инициализация SDK
- [ ] Определение среды: `isTMA()` — работаем в Telegram или нет

### Аутентификация через initData
- [ ] `POST /api/telegram/auth` — верификация initData
- [ ] HMAC-SHA256 проверка: `secret_key = HMAC-SHA256("WebAppData", bot_token)`
- [ ] Проверка: timestamp не старше 1 часа
- [ ] Найти пользователя по telegram_id или email, вернуть сессию
- [ ] Если аккаунт не найден — предложение войти по email

### Layout Telegram Mini App
- [ ] `app/[locale]/(telegram)/layout.tsx`
- [ ] Bottom navigation (4 иконки): Курсы, Прогресс, Сертификаты, Профиль
- [ ] Touch-friendly кнопки (min 44px target area)
- [ ] Убрать sidebar (не нужен в Telegram)
- [ ] Использовать Telegram theme colors через SDK

### Адаптация UI
- [ ] Определить TMA среду и переключить layout автоматически
- [ ] Back button через Telegram SDK (вместо браузерного)
- [ ] Haptic feedback на key actions (SDK)
- [ ] Swipe gestures для навигации между видео

### Доступный функционал
- [ ] Курсы (список + детали)
- [ ] Видеоплеер (с прогрессом)
- [ ] Сертификаты
- [ ] Профиль
- [ ] НЕ доступно: /admin/*

### Проверка
- [ ] Открывается как Mini App в Telegram iOS
- [ ] Открывается как Mini App в Telegram Android
- [ ] initData верификация работает
- [ ] Видео воспроизводится в Telegram WebView
- [ ] Bottom navigation работает
- [ ] Прогресс синхронизируется с web версией
