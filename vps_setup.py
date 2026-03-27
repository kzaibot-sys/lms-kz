import paramiko
import time
import sys

# Connection details
HOST = '89.124.67.107'
USER = 'root'
PASS = '9yH8566Gfg4u7~3hL5VL'

print("=" * 70)
print("LMS VPS Infrastructure Setup - Phase 0")
print("=" * 70)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"\nConnecting to {HOST}...")
client.connect(HOST, username=USER, password=PASS, timeout=30)
print("Connected successfully!\n")

results = {}

def run(cmd, timeout=300, label=None):
    lbl = label or cmd[:60]
    print(f"\n{'='*60}")
    print(f">>> {lbl}")
    print(f"CMD: {cmd[:120]}")
    print('='*60)
    sys.stdout.flush()
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdout.channel.set_combine_stderr(True)
    out = stdout.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    # Print last 3000 chars of output
    display = out[-3000:] if len(out) > 3000 else out
    print(display)
    print(f"[Exit code: {code}]")
    sys.stdout.flush()
    return code, out

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Update system and install basics
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 1: Update system and install basics")
print("="*70)

code, out = run(
    'DEBIAN_FRONTEND=noninteractive apt-get update -y 2>&1 | tail -5',
    timeout=120, label="apt-get update"
)
results['step1_update'] = code

code, out = run(
    'DEBIAN_FRONTEND=noninteractive apt-get upgrade -y 2>&1 | tail -10',
    timeout=300, label="apt-get upgrade"
)
results['step1_upgrade'] = code

code, out = run(
    'DEBIAN_FRONTEND=noninteractive apt-get install -y curl wget git vim htop ufw fail2ban nginx certbot python3-certbot-nginx 2>&1 | tail -15',
    timeout=300, label="apt-get install basics"
)
results['step1_install'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Install Docker
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 2: Install Docker")
print("="*70)

code, out = run(
    'curl -fsSL https://get.docker.com | sh 2>&1 | tail -20',
    timeout=300, label="Install Docker via get.docker.com"
)
results['step2_docker_install'] = code

code, out = run('systemctl enable docker && systemctl start docker', timeout=30)
results['step2_docker_enable'] = code

code, out = run('usermod -aG docker root', timeout=10)
results['step2_docker_usermod'] = code

code, out = run('docker --version', timeout=10)
results['step2_docker_version'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 3: Install Docker Compose v2
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 3: Install Docker Compose v2")
print("="*70)

code, out = run('mkdir -p /usr/local/lib/docker/cli-plugins', timeout=10)
results['step3_mkdir'] = code

code, out = run(
    'curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose 2>&1',
    timeout=120, label="Download Docker Compose v2"
)
results['step3_compose_download'] = code

code, out = run('chmod +x /usr/local/lib/docker/cli-plugins/docker-compose', timeout=10)
results['step3_compose_chmod'] = code

code, out = run('docker compose version', timeout=10)
results['step3_compose_version'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 4: Configure UFW firewall
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 4: Configure UFW firewall")
print("="*70)

code, out = run('ufw allow 22/tcp', timeout=15)
results['step4_ufw_22'] = code

code, out = run('ufw allow 80/tcp', timeout=15)
results['step4_ufw_80'] = code

code, out = run('ufw allow 443/tcp', timeout=15)
results['step4_ufw_443'] = code

code, out = run('ufw allow 3000/tcp', timeout=15)
results['step4_ufw_3000'] = code

code, out = run('ufw --force enable', timeout=30)
results['step4_ufw_enable'] = code

code, out = run('ufw status', timeout=10)
results['step4_ufw_status'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 5: Install Redis via Docker
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 5: Install Redis via Docker")
print("="*70)

code, out = run(
    'docker run -d --name redis --restart always -p 6379:6379 redis:7-alpine 2>&1',
    timeout=120, label="Start Redis container"
)
results['step5_redis'] = code

code, out = run('docker ps --filter name=redis', timeout=10)
results['step5_redis_check'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 6: Set up self-hosted Supabase
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 6: Set up self-hosted Supabase")
print("="*70)

code, out = run(
    'git clone --depth 1 https://github.com/supabase/supabase /opt/supabase 2>&1',
    timeout=300, label="Clone Supabase repo"
)
results['step6_clone'] = code

code, out = run('cp /opt/supabase/docker/.env.example /opt/supabase/docker/.env', timeout=10)
results['step6_cp_env'] = code

# Edit the .env file with required values using sed
env_edits = [
    ("sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=LmsKz2026SecurePass!/' /opt/supabase/docker/.env", "Set POSTGRES_PASSWORD"),
    ("sed -i 's/^JWT_SECRET=.*/JWT_SECRET=LmsKzJwtSecret2026SuperSecureKey32chars!!/' /opt/supabase/docker/.env", "Set JWT_SECRET"),
    (r"""sed -i 's|^ANON_KEY=.*|ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNDEwMDAwMCwiZXhwIjo0Nzg5NzYwMDAwfQ.4zWMBILZMwDkDMm7fCh9i3V0sIPgS_v6BkPBBMCwJHo|' /opt/supabase/docker/.env""", "Set ANON_KEY"),
    (r"""sed -i 's|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM0MTAwMDAwLCJleHAiOjQ3ODk3NjAwMDB9.gHkQnrVgkdZ9l2mwYqGvYuqFsqFZ_8EjSoAKGlqBKMo|' /opt/supabase/docker/.env""", "Set SERVICE_ROLE_KEY"),
    ("sed -i 's|^SITE_URL=.*|SITE_URL=http://89.124.67.107:3000|' /opt/supabase/docker/.env", "Set SITE_URL"),
    ("sed -i 's|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://89.124.67.107:8000|' /opt/supabase/docker/.env", "Set API_EXTERNAL_URL"),
]

for cmd, lbl in env_edits:
    code, out = run(cmd, timeout=10, label=lbl)
    results[f'step6_env_{lbl}'] = code

# Verify key env values
code, out = run('grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|SITE_URL|API_EXTERNAL_URL)=" /opt/supabase/docker/.env', timeout=10)

# Start Supabase
code, out = run(
    'cd /opt/supabase/docker && docker compose pull 2>&1 | tail -20',
    timeout=600, label="Docker compose pull Supabase images"
)
results['step6_compose_pull'] = code

code, out = run(
    'cd /opt/supabase/docker && docker compose up -d 2>&1',
    timeout=300, label="Docker compose up Supabase"
)
results['step6_compose_up'] = code

print("\nWaiting 30 seconds for Supabase services to start...")
time.sleep(30)

code, out = run('docker ps --format "table {{.Names}}\\t{{.Status}}"', timeout=15, label="Check running containers")
results['step6_containers'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 7: Configure Nginx as reverse proxy
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 7: Configure Nginx reverse proxy")
print("="*70)

nginx_config = r"""server {
    listen 80;
    server_name 89.124.67.107;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Supabase API
    location /supabase/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
"""

# Write nginx config using tee
write_nginx_cmd = f"cat > /etc/nginx/sites-available/lms << 'NGINX_EOF'\n{nginx_config}\nNGINX_EOF"
code, out = run(write_nginx_cmd, timeout=10, label="Write nginx config")
results['step7_nginx_write'] = code

code, out = run(
    'ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/lms && '
    'rm -f /etc/nginx/sites-enabled/default',
    timeout=10, label="Enable nginx site"
)
results['step7_nginx_enable'] = code

code, out = run('nginx -t 2>&1', timeout=15, label="Test nginx config")
results['step7_nginx_test'] = code

code, out = run('systemctl reload nginx', timeout=15)
results['step7_nginx_reload'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 8: Install Node.js 20
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 8: Install Node.js 20")
print("="*70)

code, out = run(
    'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -10',
    timeout=120, label="Setup NodeSource repo"
)
results['step8_nodesource'] = code

code, out = run(
    'DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs 2>&1 | tail -10',
    timeout=120, label="Install Node.js"
)
results['step8_nodejs'] = code

code, out = run('node --version && npm --version', timeout=10)
results['step8_versions'] = code

code, out = run('npm install -g pm2 2>&1 | tail -5', timeout=120, label="Install PM2")
results['step8_pm2'] = code

code, out = run('pm2 --version', timeout=10)
results['step8_pm2_version'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 9: Install yt-dlp and FFmpeg
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 9: Install yt-dlp and FFmpeg")
print("="*70)

code, out = run(
    'DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg 2>&1 | tail -10',
    timeout=120, label="Install FFmpeg"
)
results['step9_ffmpeg'] = code

code, out = run('ffmpeg -version 2>&1 | head -3', timeout=10)
results['step9_ffmpeg_version'] = code

code, out = run(
    'curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp 2>&1',
    timeout=120, label="Download yt-dlp"
)
results['step9_ytdlp_download'] = code

code, out = run('chmod a+rx /usr/local/bin/yt-dlp && yt-dlp --version', timeout=10)
results['step9_ytdlp_version'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 10: Create app directory and environment
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 10: Create app directory and environment")
print("="*70)

code, out = run('mkdir -p /opt/lms-app', timeout=10)
results['step10_mkdir'] = code

env_content = """NEXT_PUBLIC_SUPABASE_URL=http://89.124.67.107:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNDEwMDAwMCwiZXhwIjo0Nzg5NzYwMDAwfQ.4zWMBILZMwDkDMm7fCh9i3V0sIPgS_v6BkPBBMCwJHo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM0MTAwMDAwLCJleHAiOjQ3ODk3NjAwMDB9.gHkQnrVgkdZ9l2mwYqGvYuqFsqFZ_8EjSoAKGlqBKMo
EXTERNAL_API_KEY=LmsKzExternalApiKey2026!
REDIS_URL=redis://localhost:6379
TELEGRAM_BOT_TOKEN=placeholder
NEXT_PUBLIC_APP_URL=http://89.124.67.107:3000
INTERNAL_API_SECRET=LmsKzInternalSecret2026!
"""

write_env_cmd = f"cat > /opt/lms-app/.env << 'ENV_EOF'\n{env_content}ENV_EOF"
code, out = run(write_env_cmd, timeout=10, label="Write .env file")
results['step10_env_write'] = code

code, out = run('cat /opt/lms-app/.env', timeout=10)
results['step10_env_verify'] = code

# ─────────────────────────────────────────────────────────────────────────────
# STEP 11: Verify everything
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("STEP 11: Verification")
print("="*70)

print("\n--- docker ps ---")
code, out = run('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', timeout=15)
results['step11_docker_ps'] = code

print("\n--- nginx -t ---")
code, out = run('nginx -t 2>&1', timeout=15)
results['step11_nginx_test'] = code

print("\n--- Supabase health check ---")
code, out = run('curl -s --max-time 10 http://localhost:8000/health 2>&1', timeout=30)
results['step11_supabase_health'] = code

print("\n--- Redis ping ---")
code, out = run('docker exec redis redis-cli ping 2>&1', timeout=15)
results['step11_redis_ping'] = code

print("\n--- Node.js and tools versions ---")
code, out = run('node --version && npm --version && pm2 --version && ffmpeg -version 2>&1 | head -1 && yt-dlp --version', timeout=15)
results['step11_versions'] = code

print("\n--- UFW status ---")
code, out = run('ufw status verbose', timeout=10)
results['step11_ufw'] = code

print("\n--- Disk usage ---")
code, out = run('df -h /', timeout=10)
results['step11_disk'] = code

# ─────────────────────────────────────────────────────────────────────────────
# FINAL REPORT
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*70)
print("FINAL STATUS REPORT")
print("="*70)

passed = []
failed = []

for step, code in results.items():
    if code == 0:
        passed.append(step)
    else:
        failed.append(f"{step} (exit code: {code})")

print(f"\nPASSED ({len(passed)}):")
for s in passed:
    print(f"  [OK] {s}")

if failed:
    print(f"\nFAILED ({len(failed)}):")
    for s in failed:
        print(f"  [FAIL] {s}")
else:
    print("\nAll steps completed successfully!")

client.close()
print("\nSSH connection closed.")
