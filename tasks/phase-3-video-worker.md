# Фаза 3: Видео-воркер

> Статус: Ожидает | Оценка: 3–4 дня | Зависит от: Фаза 1

## Чеклист

### Инфраструктура воркера
- [ ] Создать `worker/` директорию
- [ ] Установить зависимости: `bullmq`, `ioredis`, `fluent-ffmpeg`, `@supabase/supabase-js`
- [ ] `worker/index.ts` — инициализация Bull Queue, подключение Redis
- [ ] `worker/package.json` + `worker/tsconfig.json`

### YouTube загрузка
- [ ] `worker/processors/youtube.ts`
- [ ] yt-dlp: скачать видео в `/tmp/[video_id].mp4`
- [ ] Обработка ошибок yt-dlp (недоступное видео, private)

### Upload обработка
- [ ] `worker/processors/upload.ts`
- [ ] Получить временный URL из Supabase Storage
- [ ] Скачать загруженный файл в `/tmp/`

### FFmpeg HLS конвертация
- [ ] `worker/utils/ffmpeg.ts`
- [ ] Конвертация в 3 качества: 480p (800k), 720p (2500k), 1080p (5000k)
- [ ] Генерация adaptive master.m3u8
- [ ] Thumbnail extraction (первый кадр или 5-я секунда)

### Загрузка в Supabase Storage
- [ ] `worker/utils/storage.ts`
- [ ] Загрузить все `.ts` сегменты и `.m3u8` плейлисты
- [ ] Путь: `videos/[video_id]/[quality]/`
- [ ] Master playlist: `videos/[video_id]/master.m3u8`
- [ ] Установить публичный доступ к бакету `videos`

### Обновление БД + Webhook
- [ ] После успеха: UPDATE videos SET processing_status='ready', hls_url=...
- [ ] При ошибке: UPDATE videos SET processing_status='error', processing_error=...
- [ ] UPDATE video_processing_jobs SET status='done'/'failed'
- [ ] `POST /api/internal/video-processed` — webhook для Realtime обновления UI

### Bull Queue конфигурация
- [ ] Retry: до 3 попыток с экспоненциальной задержкой
- [ ] Concurrency: 2 (параллельная обработка)
- [ ] Очистка завершённых задач через 24 часа

### Интеграция с Next.js API
- [ ] `POST /api/admin/courses/:id/videos` — создать запись + добавить в очередь
- [ ] `GET /api/internal/video-processed` защищён internal token
- [ ] Realtime channel `video-processing` для обновления UI

### Проверка
- [ ] YouTube URL → HLS через 2–5 минут
- [ ] Загруженный MP4 → HLS
- [ ] При ошибке — retry 3 раза
- [ ] hls_url доступен публично из Supabase Storage
