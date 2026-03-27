# Фаза 4: Видеоплеер + Прогресс

> Статус: Ожидает | Оценка: 3–4 дня | Зависит от: Фаза 3

## Чеклист

### HLS.js плеер компонент
- [ ] Установить: `npm install hls.js`
- [ ] `components/player/VideoPlayer.tsx` — Client Component
- [ ] Инициализация HLS.js с master.m3u8
- [ ] Fallback на нативный HTML5 video для Safari (нативный HLS)

### Контролы плеера
- [ ] Play / Pause кнопка
- [ ] Timeline (progress bar) с превью времени
- [ ] Volume + Mute
- [ ] Перемотка ±10 секунд (кнопки + клавиатура)
- [ ] Скорость воспроизведения: 0.5x, 1x, 1.25x, 1.5x, 2x
- [ ] Fullscreen (Fullscreen API)
- [ ] Качество: автоматическое (ABR) + ручной выбор (480p/720p/1080p)
- [ ] Keyboard shortcuts: Space (play/pause), F (fullscreen), M (mute)

### Прогресс API
- [ ] `GET /api/videos/:id/progress` — получить сохранённый прогресс
- [ ] `PUT /api/videos/:id/progress` — сохранить `{current_time, is_completed}`
- [ ] Вычисление `completion_percentage` = (current_time / duration) * 100

### Автосохранение
- [ ] Сохранять прогресс каждые 10 секунд (setInterval)
- [ ] Сохранять при pause и перед закрытием страницы (visibilitychange)
- [ ] Видео = завершено при `completion_percentage >= 90`

### Восстановление позиции
- [ ] При открытии видео: проверить сохранённый `current_time_seconds`
- [ ] Установить `video.currentTime` на сохранённую позицию

### Страница видео
- [ ] `/[locale]/courses/:courseId/videos/:videoId`
- [ ] Плеер занимает всю ширину на мобильном
- [ ] Кнопки "Предыдущее видео" / "Следующее видео"
- [ ] Название видео + описание под плеером

### Проверка
- [ ] HLS видео воспроизводится
- [ ] Прогресс сохраняется каждые 10 секунд
- [ ] После обновления страницы — восстанавливается позиция
- [ ] При 90% → is_completed = true
- [ ] Все контролы работают на мобильном
