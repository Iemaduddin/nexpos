# NEXPOS — Production Deployment

Single-business deployment: one server, one database, one store
installation. All commands assume the project root.

## 1. Requirements

- PHP 8.3 + ext-pgsql, ext-mbstring, ext-gd (receipt/product images)
- Composer, Node.js + npm
- PostgreSQL 15+
- Python 3.10+ (ML service, can live on the same host)
- Ollama (AI chat only; POS and reports work without it)
- HTTPS reverse proxy (nginx/Caddy) in front of PHP-FPM

## 2. Environment

```bash
cp .env.example .env
php artisan key:generate
```

Production values that must differ from local:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://kasir.contoh-toko.id

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=nexpos
DB_USERNAME=nexpos
DB_PASSWORD=<strong-secret>

SESSION_DRIVER=database
SESSION_ENCRYPT=true

QUEUE_CONNECTION=database
# Switch to redis only when the queue backlog demands it.

OLLAMA_URL=http://127.0.0.1:11434
ML_URL=http://127.0.0.1:8001
ML_API_TOKEN=<same-value-as-ml-service>
```

Never commit `.env`. Never enable `APP_DEBUG` outside local work.

## 3. First deploy

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan db:seed --force   # roles, admin, business settings
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Change the seeded admin password immediately
(`admin@example.com` / `password`).

## 4. Scheduler and queue (required)

Without these, ML jobs, OCR, briefing warm-up, and the `ml_runs`
history never execute.

Cron (runs every minute):

```cron
* * * * * cd /var/www/nexpos && php artisan schedule:run >> /dev/null 2>&1
```

Queue worker (systemd, restart always):

```ini
[Unit]
Description=NEXPOS queue worker
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=/var/www/nexpos
ExecStart=/usr/bin/php artisan queue:work --queue=default,ml,ai,ocr --sleep=3 --tries=3
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Monitor the backlog: `GET /health` returns `pending_jobs`
(503 when the database is unreachable).

## 5. Backup and restore

Nightly database dump (cron):

```bash
pg_dump -Fc -h 127.0.0.1 -U nexpos nexpos > /backup/nexpos-$(date +%F).dump
```

Keep 14 daily + 4 weekly copies off-server. Uploaded invoices live
under `storage/app/documents` — back that directory up together
with the dump. Restore drill quarterly:

```bash
pg_restore -c -h 127.0.0.1 -U nexpos -d nexpos /backup/nexpos-<date>.dump
```

## 6. Ollama and ML service

```bash
ollama pull qwen3:8b
ollama pull qwen3:4b
```

Keep the model loaded to avoid 10–20 s cold starts on small GPUs:

```bash
systemctl set-environment OLLAMA_KEEP_ALIVE=30m   # or export in the unit
```

ML service (systemd excerpt):

```ini
ExecStart=/var/www/nexpos/ml/.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8001 --app-dir /var/www/nexpos/ml
Environment=ML_API_TOKEN=<same-value-as-.env>
```

Verify: `GET http://127.0.0.1:8001/health` and app `GET /health`
(`"ml": true`).

## 7. Observability

- `GET /health` — uptime monitors (database, queue depth, ML).
- `ml_runs` table — every forecast/anomaly/recommend/segment run
  with duration, row count, and error text.
- `audit_logs` — logins, sales, purchases, adjustments, AI tool
  calls (`action = ai.tool`). Never logs secrets.
- Laravel logs (`storage/logs`) — ship to your log collector;
  keep `LOG_LEVEL=warning` or higher in production.

## 8. Go-live checklist

- [ ] `APP_DEBUG=false`, fresh `APP_KEY`, admin password rotated
- [ ] `migrate --force` + seed verified on a staging copy first
- [ ] Scheduler cron active (`schedule:list` shows ML jobs + briefing)
- [ ] Queue worker running (`/health` shows `pending_jobs: 0` at idle)
- [ ] Nightly `pg_dump` + `storage/app/documents` backup verified by restore
- [ ] HTTPS enforced, `SESSION_SECURE_COOKIE=true` when behind TLS
- [ ] Ollama models pulled, `OLLAMA_KEEP_ALIVE` set
- [ ] Cashier run-through: open session → sell → return → close with
      difference → reconciliation page (`sessions/{id}`) shows math
