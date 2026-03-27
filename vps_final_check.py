import paramiko
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('89.124.67.107', username='root', password='9yH8566Gfg4u7~3hL5VL', timeout=30)
print("Connected.")

def run(cmd, timeout=30, label=None):
    print(f"\n>>> {label or cmd[:70]}")
    sys.stdout.flush()
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdout.channel.set_combine_stderr(True)
    out = stdout.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    print(out)
    print(f"[Exit: {code}]")
    sys.stdout.flush()
    return code, out

# Get actual keys from supabase env
_, anon_out = run('grep "^ANON_KEY=" /opt/supabase/docker/.env', label="Get ANON_KEY")
_, svc_out = run('grep "^SERVICE_ROLE_KEY=" /opt/supabase/docker/.env', label="Get SERVICE_ROLE_KEY")

actual_anon = anon_out.strip().split('=', 1)[1] if '=' in anon_out else ''
actual_svc = svc_out.strip().split('=', 1)[1] if '=' in svc_out else ''

print(f"\nActual ANON_KEY: {actual_anon[:40]}...")
print(f"Actual SERVICE_ROLE_KEY: {actual_svc[:40]}...")

# Update lms-app .env
env_content = f"NEXT_PUBLIC_SUPABASE_URL=http://89.124.67.107:8000\nNEXT_PUBLIC_SUPABASE_ANON_KEY={actual_anon}\nSUPABASE_SERVICE_ROLE_KEY={actual_svc}\nEXTERNAL_API_KEY=LmsKzExternalApiKey2026!\nREDIS_URL=redis://localhost:6379\nTELEGRAM_BOT_TOKEN=placeholder\nNEXT_PUBLIC_APP_URL=http://89.124.67.107:3000\nINTERNAL_API_SECRET=LmsKzInternalSecret2026!\n"

stdin, stdout, stderr = client.exec_command('cat > /opt/lms-app/.env', timeout=10)
stdin.write(env_content)
stdin.channel.shutdown_write()
stdout.read()
print("\nUpdated /opt/lms-app/.env with actual Supabase keys")

run('cat /opt/lms-app/.env', label="Verify lms-app .env")

# Final verification
print("\n" + "="*60)
print("FINAL INFRASTRUCTURE VERIFICATION")
print("="*60)

run('docker ps --format "table {{.Names}}\\t{{.Status}}"', label="All containers")
run(f'curl -s -H "apikey: {actual_anon}" http://localhost:8000/auth/v1/health 2>&1', label="Supabase Auth API health")
run(f'curl -s -H "apikey: {actual_anon}" -H "Authorization: Bearer {actual_anon}" "http://localhost:8000/rest/v1/users?limit=1" 2>&1 | head -2', label="Supabase REST API query")
run('docker exec redis redis-cli ping 2>&1', label="Redis ping")
run('nginx -t 2>&1', label="Nginx config")
run('systemctl is-active nginx fail2ban 2>&1', label="Nginx + Fail2ban status")
run('node --version && npm --version && pm2 --version 2>&1 | tail -1', label="Node/npm/PM2 versions")
run('ffmpeg -version 2>&1 | head -1', label="FFmpeg version")
run('yt-dlp --version', label="yt-dlp version")
run('ufw status', label="UFW firewall")
run('df -h / | tail -1', label="Disk usage")
run('free -h | grep Mem', label="RAM usage")

client.close()
print("\nVerification complete.")
