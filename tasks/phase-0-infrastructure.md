# Фаза 0: Инфраструктура

> Статус: Ожидает | Оценка: 1–2 дня

## Цель

Поднять VPS с Docker, Nginx, SSL, Supabase и Redis готовыми к разработке.

---

## Чеклист

### VPS и базовая настройка
- [ ] Арендовать VPS (Ubuntu 22.04 LTS, min 8 GB RAM, 4 vCPU, 100 GB SSD)
- [ ] Настроить SSH ключи, отключить парольный вход
- [ ] Обновить пакеты: `apt update && apt upgrade -y`
- [ ] Установить Docker: `curl -fsSL https://get.docker.com | sh`
- [ ] Установить Docker Compose v2
- [ ] Добавить пользователя в группу docker

### DNS
- [ ] Cloudflare: создать A-запись `demo-lms` → IP VPS
- [ ] Проверить propagation (dig demo-lms.aibot.kz)

### Nginx + SSL
- [ ] Установить Nginx
- [ ] Установить Certbot (`apt install certbot python3-certbot-nginx`)
- [ ] Получить SSL сертификат для `demo-lms.aibot.kz`
- [ ] Настроить автообновление сертификата (`certbot renew --dry-run`)
- [ ] Базовый nginx.conf: reverse proxy на :3000

### Self-hosted Supabase
- [ ] Клонировать официальный docker compose: `git clone https://github.com/supabase/supabase`
- [ ] Скопировать `.env.example` → `.env`
- [ ] Сгенерировать секреты (POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY)
- [ ] Запустить: `docker compose up -d`
- [ ] Проверить: Supabase Studio доступен на :8000
- [ ] Настроить nginx: `/supabase` → Supabase Kong :8000

### Redis
- [ ] Запустить Redis через Docker: `docker run -d --name redis -p 6379:6379 redis:alpine`
- [ ] Проверить: `redis-cli ping` → PONG

### Проверка готовности
- [ ] `https://demo-lms.aibot.kz` → 200 (nginx заглушка)
- [ ] Supabase Studio открывается
- [ ] Redis отвечает
- [ ] Docker ps показывает все контейнеры Running

---

## Конфигурация Nginx

```nginx
server {
    listen 80;
    server_name demo-lms.aibot.kz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name demo-lms.aibot.kz;

    ssl_certificate /etc/letsencrypt/live/demo-lms.aibot.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo-lms.aibot.kz/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Supabase
    location /supabase/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Заметки

- Supabase требует ~2–4 GB RAM
- Видео займут место на диске (~500 MB на час HLS видео)
- Рекомендуется настроить бэкап БД с первого дня
