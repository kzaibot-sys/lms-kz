# Фаза 6: Сертификаты

> Статус: Ожидает | Оценка: 2–3 дня | Зависит от: Фаза 5

## Чеклист

### PDF генерация
- [ ] Установить: `npm install pdfkit qrcode`
- [ ] `lib/certificates/generator.ts` — PDFKit шаблон
- [ ] Содержимое PDF: имя студента, курс, дата выдачи, уникальный номер, QR-код
- [ ] QR-код → URL верификации: `https://demo-lms.aibot.kz/verify/[certificate_number]`
- [ ] Логотип школы (если есть) + текст подписи
- [ ] Сохранить PDF в Supabase Storage: `certificates/[certificate_id].pdf`

### Авто-выдача
- [ ] Trigger/функция при UPDATE user_progress SET is_completed=true
- [ ] Проверка: все видео курса завершены (completion_percentage >= 90 для каждого)
- [ ] Создать запись в `certificates`
- [ ] Сгенерировать PDF → загрузить → обновить `pdf_url`
- [ ] `POST /api/certificates/generate` — server action для вызова

### API сертификатов (студент)
- [ ] `GET /api/certificates` — список сертификатов студента
- [ ] `GET /api/certificates/:id/download` — redirect на PDF URL из Storage

### Публичная верификация
- [ ] `GET /api/verify/:certificate_number` — публичный endpoint
- [ ] Страница `/verify/[certificate_number]` (без авторизации)
- [ ] Показывает: имя студента, курс, дата, статус (действителен / отозван)
- [ ] QR-код на странице ведёт на эту же страницу

### Страница "Мои сертификаты"
- [ ] `/[locale]/certificates`
- [ ] Карточка: название курса, дата выдачи, кнопка "Скачать PDF"
- [ ] Empty state для студентов без сертификатов

### Проверка
- [ ] При 100% курса → сертификат выдаётся автоматически
- [ ] PDF корректно генерируется с QR-кодом
- [ ] QR-код ведёт на рабочую страницу верификации
- [ ] Скачивание PDF работает
