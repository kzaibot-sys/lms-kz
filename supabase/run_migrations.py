#!/usr/bin/env python3
"""Run SQL migrations against Supabase PostgreSQL via SSH."""

import paramiko
import sys

VPS_HOST = '89.124.67.107'
VPS_USER = 'root'
VPS_PASS = '9yH8566Gfg4u7~3hL5VL'
DB_PASS = 'LmsKz2026SecurePass!'
DB_NAME = 'postgres'
DB_USER = 'postgres'

def run_sql(client, sql: str, description: str = ""):
    print(f"\n>>> {description or sql[:60]}...")
    cmd = f'docker exec supabase-db psql -U {DB_USER} -d {DB_NAME} -c "{sql.strip().replace(chr(34), chr(39))}"'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    if out: print(out)
    if err and code != 0: print(f"ERR: {err}")
    return code

def run_sql_file(client, filepath: str):
    print(f"\n>>> Running {filepath}...")
    cmd = f'docker exec -i supabase-db psql -U {DB_USER} -d {DB_NAME} < {filepath}'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    stdout.channel.set_combine_stderr(True)
    out = stdout.read().decode()
    code = stdout.channel.recv_exit_status()
    print(out[-3000:] if len(out) > 3000 else out)
    return code

def main():
    print("Connecting to VPS...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)
    print("Connected!")

    # Copy migration files to VPS
    import os
    migrations_dir = os.path.dirname(os.path.abspath(__file__)) + '/migrations'

    sftp = client.open_sftp()
    try:
        sftp.mkdir('/tmp/lms_migrations')
    except:
        pass

    for f in sorted(os.listdir(migrations_dir)):
        if f.endswith('.sql'):
            local = os.path.join(migrations_dir, f)
            remote = f'/tmp/lms_migrations/{f}'
            print(f"Uploading {f}...")
            sftp.put(local, remote)
    sftp.close()

    # Wait for Supabase DB to be ready
    stdin, stdout, stderr = client.exec_command(
        'docker ps --filter name=supabase-db --format "{{.Status}}"', timeout=30
    )
    status = stdout.read().decode().strip()
    print(f"Supabase DB status: {status}")

    # Run migrations
    for f in sorted(os.listdir(migrations_dir)):
        if f.endswith('.sql'):
            remote = f'/tmp/lms_migrations/{f}'
            code = run_sql_file(client, remote)
            if code != 0:
                print(f"Warning: {f} had exit code {code}")

    print("\n=== Migrations complete! ===")
    client.close()

if __name__ == '__main__':
    main()
