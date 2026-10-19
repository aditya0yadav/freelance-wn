module.exports = {
  apps: [
    {
      name: 'wanhong-surveystream',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      restart_delay: 3000,
      max_restarts: 100,
      min_uptime: '10s',
      kill_timeout: 5000,
      max_memory_restart: '1500M',
      node_args: '--max-old-space-size=1536',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      time: true
    }
  ]
};
