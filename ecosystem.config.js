module.exports = {
  apps: [
    {
      name: 'lms-app',
      script: 'npm',
      args: 'start',
      cwd: '/opt/lms-app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/lms-app-error.log',
      out_file: '/var/log/lms-app-out.log',
    },
    {
      name: 'lms-worker',
      script: 'npm',
      args: 'run worker',
      cwd: '/opt/lms-app',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/lms-worker-error.log',
      out_file: '/var/log/lms-worker-out.log',
    },
  ],
}
