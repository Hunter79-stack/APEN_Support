// PM2 process definitions — RESTRICTED APEN Support Site backends.
//
// Both proxies use ONLY Node built-ins (no node_modules required) and read
// ./.env.local at startup, so this runs on a bare Node 24 install — ideal for
// an air-gapped host. Mirrors the live server's PM2 apps (apen-stats-api :8788,
// voltron-proxy :8787).
//
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup        # run the printed command once to enable boot-start
//
// After editing .env.local:  pm2 restart <name> --update-env
module.exports = {
  apps: [
    {
      name: 'apen-stats-api',        // site stats, feedback, live-announcements, admin API — :8788
      script: 'proxy/site-stats.mjs',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      // NODE_EXTRA_CA_CERTS is REQUIRED, not optional. Node ships its own
      // Mozilla CA bundle and ignores the OS trust store, so every outbound
      // call to an internal host (Infrastructure Node probes, nginx stats,
      // LDAPS) fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE without it. It used
      // to be set only in the live pm2 process env, which meant one
      // `pm2 delete` + `pm2 start` silently wiped it — exactly what happened on
      // 2026-08-04. Declaring it here makes it survive restarts and reboots.
      env: { NODE_ENV: 'production', NODE_EXTRA_CA_CERTS: '/etc/ssl/certs/ca-certificates.crt' },
    },
    {
      name: 'voltron-proxy',         // AI chat proxy (/api/voltron-chat) — :8787
      script: 'proxy/voltron-proxy.mjs',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      // Same reason as above — this one reaches an internal HTTPS model
      // endpoint. Its running process still has the variable from an older
      // manual start; declaring it here stops the next restart from losing it.
      env: { NODE_ENV: 'production', NODE_EXTRA_CA_CERTS: '/etc/ssl/certs/ca-certificates.crt' },
    },
  ],
}
