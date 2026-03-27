# Фаза 7: Админ-панель

> Статус: Ожидает | Оценка: 4–5 дней | Зависит от: Фаза 6

## Чеклист

### Layout и авторизация
- [ ] `app/[locale]/(admin)/layout.tsx` — sidebar с admin навигацией
- [ ] Middleware: проверка роли `admin`, иначе 403
- [ ] Sidebar: Дашборд, Курсы, Студенты, Сертификаты, Выход

### Дашборд (статистика)
- [ ] `GET /api/admin/stats` — KPI: всего студентов, активных за 7 дней, сертификатов
- [ ] `GET /api/admin/stats/activity` — активность по дням (30 дней)
- [ ] Страница `/[locale]/admin` — карточки KPI + график + топ курсов

### Управление курсами
- [ ] `GET /api/admin/courses` — все курсы (включая черновики)
- [ ] `POST /api/admin/courses` — создать курс
- [ ] `PUT /api/admin/courses/:id` — редактировать
- [ ] `DELETE /api/admin/courses/:id` — удалить
- [ ] Форма курса: название (ru/kz), описание (ru/kz), категория, сложность, обложка (upload), порядок, статус публикации

### Управление видео
- [ ] `POST /api/admin/courses/:id/videos` — добавить видео (YouTube URL или upload)
- [ ] `PUT /api/admin/videos/:id` — редактировать метаданные
- [ ] `DELETE /api/admin/videos/:id` — удалить
- [ ] `PUT /api/admin/videos/reorder` — обновить order_index
- [ ] Drag-and-drop сортировка видео в списке (dnd-kit или @dnd-kit/core)
- [ ] Индикатор статуса обработки (pending/processing/ready/error) + Realtime обновление

### Управление студентами
- [ ] `GET /api/admin/students` — список (поиск, фильтры, пагинация)
- [ ] `POST /api/admin/students` — создать студента из админки
- [ ] `GET /api/admin/students/:id` — детальный профиль + история
- [ ] `PUT /api/admin/students/:id` — редактировать
- [ ] `PUT /api/admin/students/:id/block` — блокировать / разблокировать
- [ ] `DELETE /api/admin/students/:id/progress/:courseId` — сбросить прогресс
- [ ] `GET /api/admin/students/export` — экспорт CSV (папа-парсер или native)
- [ ] Таблица: имя, email, телефон, регистрация, статус, прогресс
- [ ] Поиск по имени / email (debounced)
- [ ] Фильтры: статус (active/blocked), прогресс (> 50% и т.д.)

### Управление сертификатами
- [ ] `GET /api/admin/certificates` — все сертификаты
- [ ] `POST /api/admin/certificates` — ручная выдача (выбрать студента + курс)
- [ ] `PUT /api/admin/certificates/:id/revoke` — отозвать с причиной
- [ ] Таблица с фильтрами по студенту/курсу/статусу

### Проверка
- [ ] Все CRUD операции курсов работают
- [ ] Видео добавляется через YouTube URL и upload → статус обработки обновляется
- [ ] Drag-and-drop порядка видео сохраняется
- [ ] Студенты: поиск, фильтры, блокировка, CSV экспорт
- [ ] Ручная выдача и отзыв сертификатов работают
- [ ] Дашборд показывает корректную статистику
