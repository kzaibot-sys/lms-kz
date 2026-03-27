import paramiko
import time
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('89.124.67.107', username='root', password='9yH8566Gfg4u7~3hL5VL', timeout=30)
print("Connected.")

def run(cmd, timeout=120, label=None):
    lbl = label or cmd[:70]
    print(f"\n>>> {lbl}")
    sys.stdout.flush()
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdout.channel.set_combine_stderr(True)
    out = stdout.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    print(out[-3000:] if len(out) > 3000 else out)
    print(f"[Exit code: {code}]")
    sys.stdout.flush()
    return code, out

# Stop all supabase containers
run('cd /opt/supabase/docker && docker compose down 2>&1', label="Stop all Supabase containers", timeout=60)

# Fix the .env - forcefully set all needed values
fixes = [
    "sed -i 's/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=LmsKz2026SecurePass!/' /opt/supabase/docker/.env",
    "sed -i 's/^JWT_SECRET=.*/JWT_SECRET=LmsKzJwtSecret2026SuperSecureKey32chars!!/' /opt/supabase/docker/.env",
    r"""sed -i 's|^ANON_KEY=.*|ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNDEwMDAwMCwiZXhwIjo0Nzg5NzYwMDAwfQ.4zWMBILZMwDkDMm7fCh9i3V0sIPgS_v6BkPBBMCwJHo|' /opt/supabase/docker/.env""",
    r"""sed -i 's|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM0MTAwMDAwLCJleHAiOjQ3ODk3NjAwMDB9.gHkQnrVgkdZ9l2mwYqGvYuqFsqFZ_8EjSoAKGlqBKMo|' /opt/supabase/docker/.env""",
    "sed -i 's|^SITE_URL=.*|SITE_URL=http://89.124.67.107:3000|' /opt/supabase/docker/.env",
    "sed -i 's|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=http://89.124.67.107:8000|' /opt/supabase/docker/.env",
    "sed -i 's|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=http://89.124.67.107:8000|' /opt/supabase/docker/.env",
]

for cmd in fixes:
    run(cmd, timeout=10, label=f"Fix env: {cmd[8:50]}")

# Verify
run('grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|SITE_URL|API_EXTERNAL_URL|SUPABASE_PUBLIC_URL)=" /opt/supabase/docker/.env', label="Verify env vars")

# Remove old DB volumes (they were created with different password)
print("\n=== Removing old Supabase volumes ===")
run('docker volume ls | grep supabase 2>&1', label="List supabase volumes")
run('docker volume rm $(docker volume ls -q | grep -i supabase) 2>&1; echo "Done removing volumes"', label="Remove supabase volumes", timeout=30)

# Start fresh
print("\n=== Starting Supabase fresh ===")
run('cd /opt/supabase/docker && docker compose up -d 2>&1', label="docker compose up -d", timeout=300)

print("\n=== Waiting 90 seconds for DB to initialize ===")
time.sleep(90)

run('docker ps --format "table {{.Names}}\\t{{.Status}}"', label="Container status @ 90s")

print("\n=== Waiting 30 more seconds ===")
time.sleep(30)

run('docker ps --format "table {{.Names}}\\t{{.Status}}"', label="Container status @ 120s")

# Check logs for any still-failing containers
code, out = run('docker ps --format "{{.Names}}\\t{{.Status}}" 2>&1', label="Get container statuses")
lines = out.strip().split('\n')
for line in lines:
    if 'Restarting' in line or 'Error' in line:
        container = line.split('\t')[0]
        run(f'docker logs {container} --tail 15 2>&1', label=f"Logs for {container}")

# Health checks
run('curl -v --max-time 15 http://localhost:8000/health 2>&1', label="Supabase /health")
run('curl -s --max-time 15 http://localhost:8000/ 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d,indent=2))" 2>/dev/null || curl -s --max-time 15 http://localhost:8000/ 2>&1 | head -10', label="Supabase root endpoint")
run('docker exec redis redis-cli ping 2>&1', label="Redis ping")
run('nginx -t 2>&1', label="Nginx config test")
run('systemctl is-active nginx 2>&1', label="Nginx status")

client.close()
print("\nDone.")
