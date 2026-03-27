import paramiko
import time
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('89.124.67.107', username='root', password='9yH8566Gfg4u7~3hL5VL', timeout=30)
print("Connected.")

def run(cmd, timeout=180, label=None):
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

# The DB was initialized with the example password. We need to:
# 1. Stop everything
# 2. Remove the bind-mount DB data directory
# 3. Fix env
# 4. Restart

# Stop all supabase containers
run('cd /opt/supabase/docker && docker compose down -v 2>&1', label="docker compose down -v (remove volumes)", timeout=60)

# Remove the DB data directory (bind mount) - this is where postgres data lives
run('ls /opt/supabase/docker/volumes/ 2>&1', label="List volumes directory")
run('ls /opt/supabase/docker/volumes/db/ 2>&1', label="List db volumes directory")
run('rm -rf /opt/supabase/docker/volumes/db/data/ 2>&1 && echo "Removed DB data"', label="Remove DB data dir")

# Verify removal
run('ls /opt/supabase/docker/volumes/db/ 2>&1 || echo "db dir is clean"', label="Verify db dir cleaned")

# Confirm env is correct
run('grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|SITE_URL|API_EXTERNAL_URL|SUPABASE_PUBLIC_URL|ANON_KEY|SERVICE_ROLE_KEY)=" /opt/supabase/docker/.env', label="Verify .env values")

# Start fresh
print("\n=== Starting Supabase with fresh DB ===")
run('cd /opt/supabase/docker && docker compose up -d 2>&1', label="docker compose up -d", timeout=300)

print("\nWaiting 120 seconds for DB initialization and migrations...")
time.sleep(120)

run('docker ps --format "table {{.Names}}\\t{{.Status}}"', label="Container status @ 120s")

# Check for still-failing containers
code, out = run('docker ps -a --format "{{.Names}}\\t{{.Status}}" 2>&1', label="All container statuses")

print("\nWaiting 60 more seconds...")
time.sleep(60)

run('docker ps --format "table {{.Names}}\\t{{.Status}}"', label="Container status @ 180s")

# Check logs of key containers
run('docker logs supabase-auth --tail 10 2>&1', label="supabase-auth last 10 lines")
run('docker logs supabase-rest --tail 10 2>&1', label="supabase-rest last 10 lines")
run('docker logs supabase-analytics --tail 10 2>&1', label="supabase-analytics last 10 lines")

# Check if kong is up (it's the API gateway on port 8000)
run('docker logs supabase-kong --tail 15 2>&1', label="supabase-kong logs")

# Health checks
run('curl -s --max-time 15 http://localhost:8000/health 2>&1', label="Supabase health @ port 8000")
run('curl -s --max-time 10 http://localhost:8000/ 2>&1 | head -5', label="Kong root")
run('docker exec redis redis-cli ping 2>&1', label="Redis ping")

# Final status
run('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', label="FINAL container status")

client.close()
print("\nDone.")
