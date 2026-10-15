module.exports = {
  apps: [
    {
      name: 'wanhong-surveystream',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/pm2-err.log',
      out_file: 'logs/pm2-out.log',
      time: true
    }
  ]
};
