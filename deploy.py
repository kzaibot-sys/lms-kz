#!/usr/bin/env python3
"""
Deploy LMS app to VPS.
Usage: python3 deploy.py
"""

import paramiko
import os
import subprocess
import sys
import time

VPS_HOST = '89.124.67.107'
VPS_USER = 'root'
VPS_PASS = '9yH8566Gfg4u7~3hL5VL'
APP_DIR = '/opt/lms-app'
REPO_URL = 'https://github.com/kzaibot-sys/lms-kz.git'

def run(client, cmd, timeout=300, ignore_error=False):
    print(f"\n>>> {cmd[:100]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    stdout.channel.set_combine_stderr(True)
    out = stdout.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    output = out[-3000:] if len(out) > 3000 else out
    if output.strip():
        print(output)
    if code != 0 and not ignore_error:
        print(f"WARNING: exit code {code}")
    return code, out

def main():
    print("="*60)
    print("LMS DEPLOY TO VPS")
    print("="*60)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"\nConnecting to {VPS_HOST}...")
    client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    print("Connected!")

    # Clone or update repo
    code, _ = run(client, f'test -d {APP_DIR}/.git && echo exists || echo not_exists', ignore_error=True)

    run(client, f'''
        if [ -d "{APP_DIR}/.git" ]; then
            cd {APP_DIR} && git pull origin main
        else
            git clone {REPO_URL} {APP_DIR}
        fi
    ''', timeout=120)

    # Copy .env file
    print("\nUploading .env...")
    sftp = client.open_sftp()
    local_env = os.path.join(os.path.dirname(__file__), '.env.local')
    if not os.path.exists(local_env):
        # Use example
        local_env = os.path.join(os.path.dirname(__file__), '.env.local.example')
    sftp.put(local_env, f'{APP_DIR}/.env')
    sftp.close()

    # Install dependencies and build
    run(client, f'cd {APP_DIR} && npm ci --production=false', timeout=300)
    run(client, f'cd {APP_DIR} && npm run build', timeout=300)

    # Run database migrations
    run(client, f'python3 {APP_DIR}/supabase/run_migrations.py', timeout=120, ignore_error=True)

    # Install worker dependencies
    run(client, f'cd {APP_DIR}/worker && npm ci', timeout=120, ignore_error=True)
    run(client, f'cd {APP_DIR}/worker && npm run build', timeout=60, ignore_error=True)

    # Start/restart with PM2
    run(client, f'''
        cd {APP_DIR}
        pm2 delete lms-app 2>/dev/null || true
        pm2 delete lms-worker 2>/dev/null || true
        pm2 start npm --name lms-app -- start
        pm2 start npm --name lms-worker -- run worker
        pm2 save
        pm2 startup
    ''', timeout=60)

    # Check status
    run(client, 'pm2 status', ignore_error=True)
    run(client, 'pm2 logs lms-app --lines 20 --nostream', timeout=30, ignore_error=True)

    print("\n" + "="*60)
    print("DEPLOY COMPLETE!")
    print(f"App: http://{VPS_HOST}:3000")
    print(f"Supabase: http://{VPS_HOST}:8000")
    print("="*60)

    client.close()

if __name__ == '__main__':
    main()
